# CareerBoost

Expo React Native app for tracking job applications, targets, and insights. Data stays on the device unless you explicitly export or share it.

## Quick start

```bash
npm install
npx expo start
```

Run tests: `npm test`

## Rubric alignment (coursework)

### Persistence: SQLite and Drizzle

- **Database file:** `careerboost.db` on the device, opened with Expo SQLite (`db/client.ts`).
- **ORM:** Drizzle types and queries (`db/schema.ts`, `db/client.ts`). Migrations live under `drizzle/` and run on launch via `useMigrations` in `app/_layout.tsx`.
- **Seed:** `seedDb()` in `db/seed.ts` runs after migrations when core tables are empty. It fills `categories`, `applications`, `application_status_logs`, and `targets` with enough sample rows for daily, weekly, and monthly charts, donuts, streaks, and target outcomes. `users` is not seeded (registration creates accounts).
- **Tests:** `__tests__/seed.test.ts` and related tests guard minimum seed depth (`SEED_EXPECTED_APPLICATIONS_MIN`).

### Flexbox layout (responsive)

React Native layouts use the same Flexbox model as CSS (Yoga). Screens and shared UI rely on `StyleSheet` with `flexDirection`, `alignItems`, `justifyContent`, `flexWrap`, `flexGrow` / `flexShrink`, and `width: '100%'` so content stacks and scrolls on narrow widths. Examples: tab bodies in `app/(tabs)/`, list headers and filter rows in `app/(tabs)/index.tsx`, chart sections in `app/(tabs)/insights.tsx`, `components/ui/hero-banner.tsx`, and cards under `components/`.

### UX and accessibility

- **Accessible labels:** `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` on tabs (`app/(tabs)/_layout.tsx`), primary actions, filters, and summary regions (for example insights cards and `EmptyStateCard`).
- **Empty and error states:** Dedicated copy and components when lists are empty, when optional network features fail, or when the database is still migrating (see root `app/_layout.tsx` loading and error UI, plus cards like `components/ui/empty-state-card.tsx` and insight error boxes).
- **Colour and branding:** `constants/theme.ts`, `hooks/use-theme-palette.ts`, light/dark and optional high contrast (`contexts/app-color-scheme.tsx`). `components/ui/hero-banner.tsx` uses the CareerBoost logo asset and gradient header on main tabs.

### Data privacy (local by default, no secrets in git)

- Application, category, target, and status data are read and written only through the local SQLite file (see comments in `db/client.ts`). Optional weather or quote features use keys from your machine only.
- **`.env` is gitignored** (see `.gitignore`); copy `.env.example` to `.env` for local keys. Never commit real API keys or `*.db` database copies.
