# Deploying Youth Room to an Oracle Cloud Always Free VM

Target setup: **Express + socket.io on an Oracle Cloud Always Free VM**, with
**MongoDB Atlas M0** for the database. Both are permanently free.

This is chosen over a serverless host because the backend is stateful in two
ways that serverless breaks:

- **socket.io rooms** (`app.js`) live in the memory of one process. Multiple
  instances mean two members of the same fellowship can land on different
  instances and never see each other's messages.
- **`node-cron`** (`app.js`, hourly reading reminders) needs one always-running
  process. Scale-to-zero means it never fires; multiple instances mean every
  user gets duplicate notifications.

A single always-on VM satisfies both with **no application code changes**.

---

## 0. Gate: check the Atlas M0 size limit first

M0 caps at **512 MB**. The `BibleChapter` collection stores the full text of
every Bible in every language loaded, so this is the one thing that can
invalidate the whole plan.

In Atlas → your cluster → **Collections**, read the total data size.

| Result | What to do |
|---|---|
| Under ~400 MB | Continue. |
| Over ~400 MB | Stop and reconsider. Options: keep only the languages actually shipped, move Bible text out of Mongo into static JSON served by nginx (it is read-only reference data and never mutates), or accept a paid M10. |

Do not start the migration before this number is known.

---

## 1. Decide the domain first — it is baked into the APK

`frontend/app.config.js` copies `API_URL` into `extra.apiUrl` at **build time**,
and `frontend/src/config/api.ts` reads it from `Constants.expoConfig`. There is
deliberately no runtime fallback.

**Consequence: the backend URL is compiled into the APK. Changing it later
requires a new build and a new Play Store release.**

So do **not** point the app at the VM's raw IP or at any provider hostname.
Register a domain (or use a free subdomain provider) and point the app at
something you control, e.g. `https://api.youthroom.app`. Then any future host
move is a DNS change instead of an app release.

This decision cannot be undone cheaply once the app is published. Make it now.

---

## 2. Create the VM

Oracle Cloud → **Compute → Instances → Create Instance**.

- **Shape:** `VM.Standard.A1.Flex` (ARM Ampere). Take 2 OCPU / 12 GB, or the
  full 4 OCPU / 24 GB. Prefer this over the AMD `E2.1.Micro`, which has only
  1 GB RAM.
- **Image:** Ubuntu 22.04 or 24.04 LTS.
- **SSH keys:** upload your public key. Save the private key somewhere safe —
  there is no password login.
- Note the **public IP** when it finishes provisioning.

**ARM is safe for this project.** The dependency list is pure JavaScript —
`bcryptjs` (not the native `bcrypt`), `mongoose`, `socket.io`, `nodemailer`.
Nothing needs to compile against x86.

If Ampere capacity is unavailable in your region ("out of host capacity"), try
a different availability domain, or retry — it fluctuates.

---

## 3. Open the ports — in *both* places

This trips up nearly everyone on Oracle: there are two independent firewalls
and traffic must pass both.

**a) VCN security list** (Oracle console → Networking → your VCN → Subnet →
Security List → Add Ingress Rules):

| Source | Protocol | Port |
|---|---|---|
| `0.0.0.0/0` | TCP | 80 |
| `0.0.0.0/0` | TCP | 443 |

Do **not** open 5001 to the world. Node stays bound to localhost; nginx is the
only public listener.

**b) The instance's own iptables.** Oracle's Ubuntu images ship with rules that
drop everything except SSH:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Skipping the `netfilter-persistent save` means the rules vanish on reboot.

---

## 4. Point DNS at the VM

At your DNS provider, create an **A record** for `api.yourdomain.com` → the
VM's public IP. Verify before continuing, because certbot will fail otherwise:

```bash
dig +short api.yourdomain.com
```

---

## 5. Install the runtime

SSH in (`ssh ubuntu@<public-ip>`), then:

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
node -v   # must be >= 20, per backend/package.json engines
```

---

## 6. Deploy the code

```bash
sudo mkdir -p /srv/youthroom && sudo chown ubuntu:ubuntu /srv/youthroom
git clone https://github.com/AsirPraveen/Bible-Rental-App.git /srv/youthroom
cd /srv/youthroom/backend
npm ci --omit=dev
```

`npm ci --omit=dev` skips `nodemon`, which is only needed for local development.

---

## 7. Create the environment file — with rotated secrets

**Every credential currently in the repo is compromised** and must be replaced,
not copied. The repository is public and `backend/.env` was committed in early
history; the Mongo password is also still in `app.js`, `config/db.js` and
`scripts/migrate.js` across several commits.

Rotate all of these before they go on the new server:

- `JWT_SECRET` — **highest severity.** Tokens are stateless
  (`jwt.sign({email}, ..., {expiresIn:'30d'})`) with no server-side revocation,
  so anyone with the old secret can mint a valid token for any account.
  Changing it logs everyone out, which is the intended effect.
- The Mongo user's password (currently a 4-letter password identical to the
  username).
- Cloudinary API secret, `EMAIL_PASS`, `GROQ_API_KEY`, `STABILITY_API_KEY`.

```bash
cp /srv/youthroom/backend/.env.example /srv/youthroom/backend/.env
nano /srv/youthroom/backend/.env
chmod 600 /srv/youthroom/backend/.env
```

Generate a strong JWT secret with `openssl rand -base64 48`.

Values that differ from local development:

```ini
NODE_ENV=production
PORT=5001
TRUST_PROXY_HOPS=1
```

`TRUST_PROXY_HOPS=1` is correct because nginx is the single proxy in front of
Node. It must not be higher, or clients could spoof `X-Forwarded-For` and evade
rate limiting; it must not be `0`, or `express-rate-limit` would see nginx's IP
for every request and one user could exhaust the login limit for everybody.

Also set `GOOGLE_CLIENT_IDS` — Google sign-in **fails closed** without it.

---

## 8. Lock the Atlas allowlist down

Atlas → **Network Access**. Delete the `0.0.0.0/0` entry and add the VM's
public IP only. This is a large security win on its own: today the database is
reachable from anywhere on the internet.

---

## 9. Run it as a service

`/etc/systemd/system/youthroom.service`:

```ini
[Unit]
Description=Youth Room API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/srv/youthroom/backend
EnvironmentFile=/srv/youthroom/backend/.env
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now youthroom
sudo systemctl status youthroom
journalctl -u youthroom -f     # expect "Database Connected"
```

`Restart=always` is what replaces the platform supervision Railway gave you.

---

## 10. nginx reverse proxy — WebSocket upgrade matters

`/etc/nginx/sites-available/youthroom`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 8m;   # app.js accepts 4mb JSON bodies

    location / {
        proxy_pass http://127.0.0.1:5001;

        # Required for socket.io. Without these three lines the HTTP API works
        # fine and fellowship chat silently falls back to slow polling or fails.
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Chat sockets idle between messages; the 60s default would cut them.
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/youthroom /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. TLS

Android and iOS block cleartext HTTP by default, so this is mandatory, not
optional.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

Certbot rewrites the nginx config for 443 and installs a renewal timer. Confirm
renewal works:

```bash
sudo certbot renew --dry-run
```

Verify the API answers:

```bash
curl https://api.yourdomain.com/     # {"status":"Started"}
```

---

## 12. Point the app at the new backend and rebuild

In `frontend/.env`:

```ini
API_URL=https://api.yourdomain.com
```

Then rebuild and re-release. This step is unavoidable — the URL is compiled in.

```bash
cd frontend && npx expo prebuild --clean && cd android && ./gradlew assembleRelease
```

Keep the old Railway backend running until the new build is live and adopted.
Users on the previous APK still point at Railway, and shutting it down early
breaks the app for everyone who has not updated.

---

## 13. Backups — M0 has none

Free Atlas clusters have **no automated backups**. Set up your own.

```bash
sudo apt install -y mongodb-database-tools
mkdir -p /srv/backups
```

`/etc/cron.daily/youthroom-backup` (make it executable, `chmod +x`):

```bash
#!/bin/bash
set -euo pipefail
source /srv/youthroom/backend/.env
STAMP=$(date +%F)
mongodump --uri="$MONGO_URL" --archive="/srv/backups/youthroom-$STAMP.gz" --gzip
find /srv/backups -name 'youthroom-*.gz' -mtime +14 -delete
```

Copy the archives off the VM periodically — a backup that only exists on the
machine it protects is not a backup.

---

## 14. Verification checklist

Do not consider the migration done until all of these pass on a real device
running the new build:

- [ ] `curl https://api.yourdomain.com/` returns `{"status":"Started"}`
- [ ] Log in — exercises Mongo, bcrypt and JWT with the rotated secret
- [ ] Google sign-in works (proves `GOOGLE_CLIENT_IDS` is set)
- [ ] **Fellowship chat between two different devices** — the real socket.io
      test; one device alone can pass while rooms are broken
- [ ] Typing indicator appears on the other device
- [ ] An image upload succeeds (Cloudinary signature route)
- [ ] Bible dictionary lookup returns a result (Groq key)
- [ ] `sudo reboot`, then confirm the service came back by itself and ports 80
      and 443 still answer — this is what catches unsaved iptables rules
- [ ] Wait for the top of an hour and check `journalctl -u youthroom | grep Cron`
      for `[Cron] Reading reminders:`

---

## 15. Routine operations

```bash
# Deploy an update
cd /srv/youthroom && git pull && cd backend && npm ci --omit=dev
sudo systemctl restart youthroom

# Logs
journalctl -u youthroom -f
journalctl -u youthroom --since "1 hour ago"

# Rollback
cd /srv/youthroom && git checkout <last-good-commit>
sudo systemctl restart youthroom
```

**Rollback plan for the migration itself:** keep Railway running. If the VM
misbehaves, repoint the DNS A record back — which works precisely because the
app talks to your domain and not to a host-specific address.

---

## What this setup does not give you

Being honest about the trade-off for a free tier:

- **No SLA** on either the VM or Atlas M0.
- **Single point of failure** — one VM, no failover. A reboot is downtime.
- **Shared-CPU database.** M0 throttles under sustained load.
- **You own the maintenance:** OS patches, certificate renewals (automated but
  worth monitoring), disk space.

Realistic capacity: a 2-4 OCPU Ampere instance handles hundreds of concurrent
WebSocket connections and a few hundred requests per second for queries of this
shape — comfortably beyond a Play Store launch and into the low thousands of
registered users. The binding constraint will be M0's 512 MB long before it is
the VM.
