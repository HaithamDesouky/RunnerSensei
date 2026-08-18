RunnerSensei - Supabase integration guide

Overview
This project includes Supabase client helpers and a SQL schema to store user profiles and runs.

Files added

- infra/schema.sql — SQL to create `profiles` and `runs` tables.
- infra/README_TERRAFORM.md — notes for provisioning Supabase with CLI/Terraform.
- src/utils/supabaseClient.ts — initializes Supabase client reading from Expo `extra` or env.
- src/utils/supabaseAuth.ts — signUp/signIn/signOut/updateProfile helpers.
- src/utils/supabaseRuns.ts — saveRun/getRuns helpers.

Quick start

1. Create a free Supabase project at https://app.supabase.com
2. Open SQL editor and run `infra/schema.sql`.
3. Add your Supabase keys to your Expo config (app.config.js) under `extra`:

```js
export default {
  expo: {
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    },
  },
};
```

You can use the provided `app.config.js` template and `.env.example` in the repository root.

- Copy `.env.example` to `.env` and fill the values.
- `app.config.js` reads those env vars into `expo.extra` so the app can access them via `Constants.expoConfig.extra`.

Files:

- `app.config.js` — reads `.env` and injects `extra` for Expo.
- `.env.example` — template to copy to `.env` and populate with your Supabase URL and ANON key.

4. Install client dependencies:

```bash
npm install @supabase/supabase-js expo-constants
```

5. Use the helpers in your app. Example sign-in flow:

```ts
import { signIn } from "./src/utils/supabaseAuth";

await signIn("you@example.com", "password");
const runs = await getRuns();
```

Security

- Use Supabase Storage for user avatar images and save the public URL in `profiles.avatar_url`.
- Protect rows with RLS policies if needed. Example policy: only allow users to read/write their own runs.

Need help wiring UI components (sign-up/sign-in screens, profile save, run uploads)? I can add those next.

