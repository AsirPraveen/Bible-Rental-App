# Going to production — the whole path

The ordered sequence from an empty Oracle Cloud account to a Youth Room
release on the Play Store. Each phase links to the detailed runbook.

Work top to bottom. Phases 1-4 must be finished and verified before phase 6,
because the backend URL is compiled into the app binary and cannot be changed
afterwards without a new store release.

| # | Phase | Where | Blocking? |
|---|---|---|---|
| 0 | Check the Atlas M0 512 MB limit | [backend runbook §0](./deployment-oracle-cloud.md) | **Gate** — invalidates the plan if exceeded |
| 1 | Buy a domain, decide the API hostname | registrar | **Gate** — irreversible after release |
| 2 | Rotate every leaked credential | Atlas, Cloudinary, Gmail, Groq | **Gate** — repo is public |
| 3 | Fix the two Play policy blockers in code | this repo | **Gate** — rejection otherwise |
| 4 | Stand up the server (VM → nginx → TLS) | [backend runbook §2-§11](./deployment-oracle-cloud.md) | |
| 5 | Backups and monitoring | [backend runbook §13](./deployment-oracle-cloud.md) | |
| 6 | Create the upload keystore | [Play runbook §1](./play-store-release.md) | |
| 7 | Point the app at the domain, build the AAB | [Play runbook §3](./play-store-release.md) | |
| 8 | Play Console account and store listing | [Play runbook §4-§6](./play-store-release.md) | $25 one-time |
| 9 | Closed testing — 12 testers, 14 days | [Play runbook §7](./play-store-release.md) | **Personal accounts only** |
| 10 | Production release | [Play runbook §8](./play-store-release.md) | |

## Two things that surprise people

**The Play Store is not free.** A Google Play developer account costs a
**one-time $25**. Everything else in this plan is free, but that fee is
unavoidable. Apple's equivalent is $99 per year, which is why this plan is
Android-first.

**A personal developer account must run closed testing with at least 12
testers for 14 continuous days** before it can publish to production. Registered
company accounts are exempt. Plan for this: it means the earliest possible
production date is roughly **two to three weeks after** the app is otherwise
finished. Start phase 9 as early as you can — it can run while you polish.

## Realistic timeline

| Phase | Effort |
|---|---|
| 0-3 (gates and code fixes) | 1-2 days |
| 4-5 (server) | Half a day, plus DNS propagation |
| 6-7 (keystore, AAB) | 1-2 hours |
| 8 (console, listing, graphics) | 1 day, mostly writing copy and making screenshots |
| 9 (closed testing) | **14 days minimum, fixed by policy** |
| 10 (review) | A few hours to 7 days |
