# H4A 26/27 — Fines & Volunteer Portal

A team portal for H4A volleyball (~20 people) to submit penalty fines, log club duty (dugnad) hours and points, track leaderboards, and manage team roles — with an admin dashboard for approvals and roster management.

## Tech Stack

- [SvelteKit 2](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev/docs/svelte) (runes)
- [Vite 7](https://vitejs.dev/)
- TypeScript 5
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Firebase 12](https://firebase.google.com/) — Firestore (data) + Hosting
- `@sveltejs/adapter-static` (static build, output to `dist/`)

## Access Model

There is no Firebase Authentication. Access is controlled entirely via a URL key:

- Regular portal: `/?key=TEAM_ACCESS_KEY`
- Admin dashboard: `/admin?key=ADMIN_ACCESS_KEY`

Firestore security rules are intentionally open (`allow read, write: if true`) — access control happens at the app layer via the key, not at the database layer. This is a deliberate simplicity tradeoff for a small, trusted team; see `firestore.rules`.

## Getting Started

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGE_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ACCESS_KEY=
VITE_ADMIN_ACCESS_KEY=
```

The Firebase project is `fines-and-duties-portal`.

### Development

```bash
npm install
npm run dev       # starts dev server on http://localhost:3000
npm run check     # type-check with svelte-check
npm run build     # production build, output to dist/
npm run preview   # preview the production build locally
```

## Data Model

Core entities live in `src/lib/types.ts`:

- **`Person`** — a player or coach, with `position` (e.g. "Setter"), `roleIds` (board/committee roles like "Team Accountant" — see below), and duty-related flags.
- **`FineRule`** / **`FineReport`** — the fine catalog and individual submitted fines.
- **`DugnadActivity`** / **`DugnadEntry`** — the club duty catalog and individual logged duty entries.
- **`RoleDefinition`** — a role a person can hold (e.g. "Team Accountant"), with a fixed point value awarded to the person for as long as they hold it. Assigning/revoking a role automatically creates or removes a Club Duty entry for the points, visible in the Activity Log. Managed by admin in the "Dugnad Rates" tab.
- **`TeamSettings`** — team name, season, fine pot publication toggle, hourly duty point rate.

All live data is read and written through `src/lib/utils/store.ts` (a single reactive `h4aStore`), backed by Firestore collections `persons`, `fine_rules`, `dugnad_activities`, `role_definitions`, `fines`, `dugnad_entries`, and `settings/team`.

## Backups

See [`data/README.md`](./data/README.md) for how to export a portable backup of all team data from the admin dashboard, and how to restore it.

## Deployment

Deployed to Firebase Hosting from the `main` branch via GitHub Actions (`.github/workflows/`), building to `dist/` via `adapter-static`.
