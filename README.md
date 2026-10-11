# Hougang United Performance Hub

A responsive React and Supabase application for the SPL1 and SPL2 squads. It includes daily wellbeing check-ins, GPS/performance reporting, season activity, a squad calendar, player development goals, and player-to-coach messaging.

## Stack and structure

- React 18, TypeScript, and Vite
- Tailwind CSS with a small responsive component stylesheet
- Supabase Auth, PostgreSQL, and row-level security
- Recharts for performance visualizations; Lucide React for interface icons

```text
src/
  App.tsx                    Authentication, data access, role-aware app shell
  components/
    CalendarTab.tsx          Month, week, year views and event details
    ChatTab.tsx              Coach/player conversation
    CheckinTab.tsx           Player wellbeing check-in
    GoalsTab.tsx             Development goals and reviews
    LoginScreen.tsx          Supabase email/password login and local preview
    PerformanceTabs.tsx      GPS and season activity dashboards
    PlayerList.tsx           Squad roster cards/table and admin player actions
    PlayerManagementModal.tsx Player create, edit, and delete dialogs
  lib/
    format.ts                Profile formatting helpers
    mockData.ts              In-memory, non-production preview data
    supabase.ts              Browser Supabase client
  styles.css                 Tailwind base and responsive application styles
  types.ts                   Shared domain types
supabase/
  01_schema.sql              Tables, constraints, triggers, grants, and RLS policies
  02_local_seed.sql          Synthetic local-development teams, accounts, and metrics
```

## Run locally

### 1. Install Node.js and dependencies

Use Node.js 20 or later, then open this folder in Visual Studio Code and run:

```bash
npm install
```

### 2. Create and configure Supabase

1. Create a Supabase project and open **SQL Editor**.
2. Run [`supabase/01_schema.sql`](./supabase/01_schema.sql) to create the production schema, triggers, grants, and RLS policies. It contains no sample data or mock auth users.
   When upgrading an existing project, run the updated schema as well; it removes the old Auth-user foreign key so admins can manage roster-only player profiles, and adds generated session IDs to existing GPS records. Players added from the roster form are profile records and do not create Supabase Auth accounts.
3. Provision the two squad rows before creating/inviting users. For production, run this small, intentional data setup separately in the SQL Editor:

   ```sql
   insert into public.teams (name) values ('SPL1'), ('SPL2')
   on conflict (name) do nothing;
   ```

   The signup trigger assigns new player profiles to SPL1, so that row must exist before signup is enabled.
4. **Local testing only:** after applying `01_schema.sql`, run [`supabase/02_local_seed.sql`](./supabase/02_local_seed.sql) against a disposable local/development Supabase database. It inserts 45 synthetic player accounts (`player01@hougang.demo` through `player45@hougang.demo`) with the shared password `HougangDemo!2026`, plus sample metrics, events, and goals. The file is prominently marked local-only. **Never run it against production or a database with real user data.** Do not expose or reuse the development password.
5. Add a trusted staff account in **Authentication → Users** (or invite the staff member). Promote the account from the SQL Editor:

   ```sql
   update auth.users
   set raw_app_meta_data = jsonb_set(
     coalesce(raw_app_meta_data, '{}'::jsonb),
     '{role}',
     to_jsonb('admin'::text),
     true
   )
   where email = 'admin@example.com';

   update auth.users
   set raw_app_meta_data = jsonb_set(
     coalesce(raw_app_meta_data, '{}'::jsonb),
     '{team_id}',
     to_jsonb((select id from public.teams where name = 'SPL1')::text),
     true
   )
   where email = 'admin@example.com';

   update public.profiles
   set role = 'admin', team_id = (select id from public.teams where name = 'SPL1')
   where id = (select id from auth.users where email = 'admin@example.com');
   ```

   Set the JWT role to `official` for read-only staff and set `team_id` in `raw_app_meta_data` to the matching squad. Protect and audit all staff role changes; never allow an untrusted client to set its own role.
6. In **Project Settings → API**, copy the Project URL and the publishable/anon key. The anon key is intended for browser use; RLS is the security boundary. Never put the service-role key in a Vite environment variable.

New email/password signups receive a `player` profile in SPL1 through the database trigger. The app intentionally does not provide public signup or role selection; create/invite accounts through a trusted Supabase workflow.

### 3. Set environment variables and start Vite

Copy `.env.example` to `.env.local`, then fill in the values:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Start the development server:

```bash
npm run dev
```

With both variables omitted, the login screen offers a clearly marked in-memory preview. Preview changes are not sent to Supabase and are lost on refresh. Once Supabase is configured, email/password login is backed by Supabase Auth.

### 4. Build for production

```bash
npm run build
npm run preview
```

The Vite production output is written to `dist/`.

## Publish to GitHub

Create an empty repository on GitHub, then run from this project folder:

```bash
git init
git add .
git commit -m "Build Hougang United performance hub"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

`.env.local` and other `.env` files are excluded by `.gitignore`. Do not commit Supabase service-role keys, database passwords, or real player personal data.

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Keep the detected framework as **Vite**. The build command is `npm run build`; the output directory is `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in **Project Settings → Environment Variables** for each environment you use.
4. Redeploy after changing environment variables.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to the deployed Vercel URL and add the Vercel preview/production callback URLs to the allowed redirect URLs as needed.

## Access model

- **Admin:** full read/write access across squads and application data.
- **Official:** read-only access to profiles and performance/check-in metrics across squads. Officials can read squad calendars but cannot modify application records or access private player/coach messages.
- **Player:** can view only their own profile, check-ins, GPS/activity records, goals/reviews, and messages. Check-ins, goals, goal reviews, and player-authored messages are constrained to the authenticated player by RLS. Calendar access is limited to their assigned squad.

The data-loading UI relies on those policies rather than treating hidden controls as a security boundary. Review `supabase/01_schema.sql` and test policies with accounts for every role before onboarding real players.
