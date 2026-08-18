Supabase provisioning and Terraform notes

This document explains two approaches to provisioning a Supabase project for RunnerSensei:

1. Quick manual + client (recommended for a single-user/dev):
   - Create a free Supabase project at https://app.supabase.com
   - Go to Project Settings → API and copy `Project URL` and `anon` `public` key (or service_role for server tasks)
   - In Supabase SQL editor, run `infra/schema.sql` to create `profiles` and `runs` tables.

2. Terraform / CLI-assisted (optional):
   - Supabase has a Terraform provider (community/official). Project creation often requires organization/billing and may not be fully automated depending on your account.
   - A reliable approach is to use the Supabase CLI to create the project and then manage schema via `supabase db` or SQL files. You can wrap CLI calls in Terraform using `null_resource` + `local-exec`.

Example (null_resource + supabase CLI):

```hcl
variable "project_name" { default = "runnersensei" }
variable "db_password" { default = "changeme123" }

resource "null_resource" "create_supabase_project" {
  provisioner "local-exec" {
    command = "supabase projects create --name ${var.project_name} --db-password ${var.db_password}"
  }
}
```

Notes:

- The CLI approach requires the `supabase` CLI to be installed and authenticated locally: `npm i -g supabase` and `supabase login`.
- Using the CLI via Terraform means provisioning happens on the machine that runs `terraform apply` (not a remote controller).
- For full Terraform-driven infra you can evaluate the official/third-party Supabase Terraform provider: https://registry.terraform.io/providers/supabase/supabase/latest (check docs for provider setup and API keys).

Security and keys

- Treat the `service_role` key as a secret (only use server-side). Use the `anon`/public key in clients.
- Store keys in a secure place (CI secrets, `.env` for local dev — don't commit).

Next steps (client integration)

- After creating the project and running `infra/schema.sql`, add the `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your Expo app (via `app.config` or environment variables). See `src/utils/supabaseClient.ts` for an example.

If you'd like, I can generate a full Terraform file that uses the Supabase provider (requires your Supabase API token) — tell me if you want that and whether you can provide a service token or prefer CLI-based provisioning.
