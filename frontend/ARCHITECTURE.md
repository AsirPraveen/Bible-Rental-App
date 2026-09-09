# Frontend architecture

Expo SDK 54 / React Native 0.81 / React 19, TypeScript strict.

This document is the contract for new code. Most rules here exist because the
opposite caused a real bug — those are called out, because a convention whose
reason is forgotten gets "cleaned up" by the next person.

## Layout

```
src/
  app/          App root: providers, navigation container, boot status bar
  navigation/   Navigators only. No screen logic.
  screens/      One directory per feature (see below).
  components/   Shared presentational components (ScreenContainer, ScreenHeader…)
  services/     ALL network access to our backend. Typed, per domain.
  hooks/        Reusable behaviour (useSystemBars…)
  context/      App-wide state (Auth, Organization, Theme, Socket)
  theme/        Colour maths and design tokens
  types/        Shared entity shapes mirroring backend/models
  config/       Environment plumbing (API base URL, Firebase)
  utils/        Framework-agnostic helpers and third-party calls
  assets/
```

### Screen folders

Every folder under `src/screens` has the same shape. Only `index.ts` and at
least one screen are mandatory; the rest appear when the feature needs them.

```
src/screens/<Feature>/
  index.ts                 barrel — the ONLY path navigators import from
  <Name>Screen.tsx         a screen; one file each
  <Name>Tab.tsx            a tab rendered inside a screen
  components/              components used only by this feature
  types.ts                 types used only by this feature
  styles.ts                see below
  <feature>Service.ts      feature logic that is not just HTTP
```

Rules, and why:

- **Folder = the feature, in PascalCase, with no `Screen`/`Component` suffix.**
  Everything under `screens/` is a screen; repeating it adds nothing. Where a
  route exists the folder matches its name (`Onboarding`, `Notifications`).
- **Files carry their role**: `…Screen.tsx`, `…Tab.tsx`, `…Modal.tsx`. A modal
  or card lives in `components/`, not beside the screens.
- **Navigators import the barrel**, never a file:
  `import { AllBooksScreen } from '@/screens/AllBooks';`
  That is what lets a screen be renamed or split without touching navigation.
- **Styles live in the screen file** (`const getStyles = (colors: ColorsType) =>
  StyleSheet.create({...})` at the foot), which is what ~70 screens do. Pull
  them into `styles.ts` only when they are **shared by 2+ screens** (`Auth/`) or
  need **module-scope constants** (`Home/`, `Onboarding/` compute from
  `Dimensions.get()`). Otherwise a separate file is just indirection.
- **A single-file `types/` or `services/` folder is flattened** to `types.ts` /
  `<feature>Service.ts`. Folders are for two or more files.
- **`getStyles` takes `ColorsType`**, never `any` — an untyped palette silently
  accepts misspelled colour keys.

Import with the `@/` alias, which maps to `src/`:

```ts
import { booksService } from '@/services';
import { useSystemBars } from '@/hooks/useSystemBars';
```

Metro resolves this natively via `tsconfig.json` paths — no Babel plugin. A
single `../` for a sibling is fine; `../../` and deeper should use the alias.

## Network access

**Screens never import `axios`.** They call a module from `@/services`.

`services/apiClient.ts` is one shared axios instance that attaches the bearer
token and turns failures into `ApiError` (`status`, `code`, `isNetworkError`).

> **Why.** Before this existed there were 222 bare `axios` calls. Sixty read the
> token out of AsyncStorage; only 21 actually sent it. The rest silently made
> unauthenticated requests, which the server answers differently. Centralising
> it makes that class of bug impossible.

`apiClient` also attaches **`x-organization-id`**, which the server uses to pick
the tenant. This must live in the interceptor, not on `axios.defaults`: an
instance created by `axios.create()` copies the global defaults **once, at
creation**, so later mutations of `axios.defaults.headers.common` never reach
it. Session handling (401 -> logout, `ORG_SUSPENDED`, `ORG_NOT_FOUND`) is
registered on `apiClient` by `AuthContext` and runs *after* the normalising
interceptor, so it reads `error.status` / `error.code` off `ApiError`.

The interceptor is scoped to `baseURL`. Anything talking to a **third party**
(Cloudinary, Google) must use bare `axios` from `src/utils`, so our credentials
can never be sent to another host. `utils/cloudinaryUpload.ts` is the one
example: it asks *our* server for a signature via `apiClient`, then posts the
file to `api.cloudinary.com` with bare `axios`.

Adding an endpoint: put it in the matching `services/<domain>.ts`, give it a
return type from `@/types/models`, and export it from `services/index.ts`.

## Screens and the system bars

Every screen owns its own status bar and Android navigation bar:

```tsx
export default function MyScreen() {
  const { colors } = useTheme();
  useSystemBars({ top: colors.linearGradient[0] });   // colour THIS screen paints
  …
}
```

Under Android edge-to-edge (the SDK 54 default) **neither system bar has a
background** — `setBackgroundColorAsync` is a documented no-op, and the screen's
own pixels show through both. The only controllable thing is icon colour, and it
must contrast with whatever is behind it. `useSystemBars` derives that from the
colour you pass, using the exact luminance crossover in `theme/systemBars.ts`.

> **Why not a central rule.** This replaced a hand-maintained list of route names
> in `app/index.tsx`. It could not work: the colour behind the bars is a
> per-screen fact, so any screen missing from the list inherited the wrong icons.
> The measured result was 9 screens with invisible status-bar icons (1.12:1) and
> 45 with an unreadable nav bar. After the change the worst case anywhere is
> 5.83:1.

Pass `bottom` separately when the bottom of the screen differs from the top —
most importantly for **tab children**, where the tab bar supplies the colour:

```tsx
useSystemBars({ top: colors.linearGradient[0], bottom: colors.background });
```

### Safe areas

Use `SafeAreaView` from **`react-native-safe-area-context`**, never from
`react-native` — the built-in one is a **no-op on Android** and is lint-blocked.

A **tab child must not claim the bottom edge**: `AnimatedTabBar` already sizes
itself `60 + insets.bottom`, so claiming it again reserves the space twice and
shows as an empty band above the tab bar.

```tsx
<SafeAreaView edges={['top', 'left', 'right']} …>   // tab child
<SafeAreaView …>                                     // everything else: all edges
```

`components/ScreenContainer.tsx` bundles all of the above and is the preferred
root for new screens.

### Modals

Full-screen `Modal`s need both flags, or the backdrop stops short of the system
bars and they stay bright while everything else dims:

```tsx
<Modal statusBarTranslucent navigationBarTranslucent …>
```

## Conventions

- **One screen per directory.** `screens/Foo/Foo.tsx`, or `index.tsx` when the
  directory *is* the screen. Do not have both — `MessageNotes/` had a stale
  221-line `index.tsx` shadowing the real 843-line screen, so edits to the
  obvious file did nothing.
- **Container/view splits must earn their keep.** `InitialScreen/index.jsx`
  holds auth-routing logic and renders a presentational view: fine. A wrapper
  that only renders `<View/>` with no props is deleted.
- **Styles** are `getStyles(colors)` factories so they follow the theme.
- **No `&`, spaces, or punctuation in paths.**
- **TypeScript only.** `src` contains no `.js`/`.jsx`. Untyped files silently
  opt out of every guarantee here -- `Auth/Login` used
  `const {...} = require('react-native')`, which hid a deprecated Android-no-op
  `SafeAreaView` from two separate codemods.

## Enforced by lint

`npm run lint` must stay at **0 errors**.

| Rule | Severity | Why |
|---|---|---|
| `SafeAreaView` from `react-native` | error | no-op on Android |
| `<StatusBar>` in a screen | error | competing instances; last mount wins |
| `axios.get/post/...` | error | bypasses auth, org scoping and error handling |

`src/services/**` and `src/utils/**` are exempt from the axios rule -- the
client itself lives in one, and third-party calls belong in the other.

## Backend

```
backend/
  app.js         Express app, sockets, cron, env fail-fast
  routes/        <domain>Routes.js  — wiring + middleware only
  controllers/   <domain>Controller.js — one exported handler per route
  models/        PascalCase Mongoose models
  middleware/    auth, orgScope, adminAuth, superAdminAuth, requireFeature
  utils/         cross-cutting helpers
  scripts/       one-off migrations and seeds
  config/
```

- **A route file wires; a controller handles.** No inline `async (req, res)` in
  `routes/` — `authorRoutes.js` was the last one and is now split.
- **Models are PascalCase** (`Author.js`, not `author.js`) so they match the
  Mongoose model name they export.
- **Every org-scoped route runs `auth → orgScope → …`**, and the tenant comes
  from the token via `req.orgId`, never from the request body.

## Known debt

- 20 header blocks still hand-written. They are the shapes `ScreenHeader` cannot
  express yet (no back button, no title, or a bespoke multi-row layout); the 15
  standard back+title rows have been migrated.
- Each screen declares its own `RootStackParamList`. One shared param list would
  make `navigate()` typo-proof across the app.
- `Bible.tsx` (2.6k lines), `ChatScreen.tsx` (2.2k) want decomposition.
- ~415 lint warnings (unused vars, `react-hooks/exhaustive-deps`).
