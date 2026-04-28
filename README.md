# CareerBoost

**GitHub repository:** https://github.com/katelyncahalane/IS4447_122421864_CareerBoost.git  
**Expo link / QR (for marking):**
https://expo.dev/preview/update?message=Final+submission&updateRuntimeVersion=1.0.0&createdAt=2026-04-28T20%3A36%3A42.134Z&slug=exp&projectId=d82396d7-4b37-4e48-b9e5-809d2f91d83c&group=2853c044-4dc0-483d-9752-3523f75e059f

CareerBoost is a production-style mobile app built with React Native (Expo).  
**Coursework option: C) Job applications tracker.**

It lets users add, edit, and delete job application records, organise them using categories, set weekly or monthly targets, and view daily, weekly, and monthly insights with charts. All core record data is stored locally on the device.

## Quick start

### 1) Install dependencies

```bash
npm install
```

### 2) Start the app (Expo Go)

```bash
npx expo start
```

- Install **Expo Go** on your phone (iOS or Android).
- Scan the QR code shown in the terminal.
- If you change configuration or dependencies, restart with cache clear:

```bash
npx expo start -c
```

### 3) Run tests

```bash
npm test
```

### 4) Publish the Expo link / QR for marking (EAS Update)

When ready to publish a public preview link/QR:

```bash
eas update --branch production --message "Final submission"
```

Then open the Expo dashboard project preview link/QR and paste it at the top of this README.

## Rubric alignment (coursework)

### Persistence: local storage (Drizzle)

- **Data file:** `careerboost.db` on the device, local only (`db/client.ts`). Implementation uses Expo’s SQLite-backed driver (markers: see `db/client.ts` and Drizzle docs).
- **ORM:** Drizzle types and queries (`db/schema.ts`, `db/client.ts`). Migrations live under `drizzle/` and run on launch via `useMigrations` in `app/_layout.tsx`.
- **Seed:** `seedDb()` in `db/seed.ts` runs after migrations when core tables are empty. It fills `categories`, `applications`, `application_status_logs`, and `targets` with enough sample rows for daily, weekly, and monthly charts, donuts, streaks, and target outcomes. `users` is not seeded (registration creates accounts).
- **Tests:** `__tests__/seed.test.ts` and related tests guard minimum seed depth (`SEED_EXPECTED_APPLICATIONS_MIN`).

### Flexbox layout (responsive)

React Native layouts use the same Flexbox model as CSS (Yoga). Screens and shared UI rely on `StyleSheet` with `flexDirection`, `alignItems`, `justifyContent`, `flexWrap`, `flexGrow` / `flexShrink`, and `width: '100%'` so content stacks and scrolls on narrow widths. Examples: tab bodies in `app/(tabs)/`, list headers and filter rows in `app/(tabs)/index.tsx`, chart sections in `app/(tabs)/insights.tsx`, `components/ui/hero-banner.tsx`, and cards under `components/`.

### UX and accessibility

- **Accessible labels:** `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` on tabs (`app/(tabs)/_layout.tsx`), primary actions, filters, and summary regions (for example insights cards and `EmptyStateCard`).
- **Empty and error states:** Dedicated copy and components when lists are empty, when optional network features fail, or while saved data is still preparing (see root `app/_layout.tsx` loading and error UI, plus cards like `components/ui/empty-state-card.tsx` and insight error boxes).
- **Colour and branding:** `constants/theme.ts`, `hooks/use-theme-palette.ts`, light/dark and optional high contrast (`contexts/app-color-scheme.tsx`). `components/ui/hero-banner.tsx` uses the CareerBoost logo asset and gradient header on main tabs.

### Data privacy (local by default, no secrets in git)

- Application, category, target, and status data are read and written only to the local data file on the device (see `db/client.ts`). Optional weather or quote features use keys from your machine only.
- **`.env` is gitignored** (see `.gitignore`); copy `.env.example` to `.env` for local keys. Never commit real API keys or `*.db` database copies.
