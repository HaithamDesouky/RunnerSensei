# RunnerSensei – Terraform (learning module)

This directory provisions the app's backing infrastructure on
[Supabase](https://supabase.com) using the official
[`supabase/supabase`](https://registry.terraform.io/providers/supabase/supabase/latest)
Terraform provider.

The goal is educational: read each `*.tf` file top-to-bottom to see how a small,
real-world stack is expressed as code.

## What it creates

| Resource                      | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `random_password.db`          | Auto-generated Postgres password if you don't supply one.      |
| `supabase_project.this`       | The Supabase project (Postgres + Auth + Storage).              |
| `supabase_settings.this`      | API / Auth / Storage configuration (site URL, file limits, …). |
| `supabase_apikey.publishable` | Publishable API key consumed by the Expo client.               |
| `null_resource.apply_schema`  | Runs `infra/schema.sql` via `psql` after the project is ready. |

## File layout

```
infra/terraform/
├── versions.tf              # Terraform + provider version pins, backend
├── providers.tf             # Provider configuration
├── variables.tf             # Input variables (organization, region, …)
├── main.tf                  # Project + password
├── settings.tf              # supabase_settings (api/auth/storage)
├── apikeys.tf               # Publishable API key
├── schema.tf                # Applies infra/schema.sql via psql
├── outputs.tf               # project_ref, url, keys (sensitive)
├── terraform.tfvars.example # Copy to terraform.tfvars
├── .gitignore
└── README.md
```

## Prerequisites

1. Install Terraform ≥ 1.6: `brew install terraform`
2. Install `psql` (for `null_resource.apply_schema`): `brew install libpq && brew link --force libpq`
3. Create a Supabase **personal access token**:
   <https://supabase.com/dashboard/account/tokens>
4. Find your **organization slug** in the dashboard URL:
   `https://supabase.com/dashboard/org/<slug>`

## Usage

```bash
cd infra/terraform

# 1. Configure inputs
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars                # set organization_id, region, etc.

# 2. Provide the access token via env (preferred over tfvars)
export SUPABASE_ACCESS_TOKEN="sbp_xxx"

# 3. Initialise providers
terraform init

# 4. Preview
terraform plan -out=tfplan

# 5. Apply
terraform apply tfplan

# 6. Read outputs (some are sensitive)
terraform output
terraform output -raw publishable_api_key
terraform output -raw supabase_url
```

## Wiring the outputs into the Expo app

After `apply` finishes, populate `.env` at the repo root so `app.config.js`
picks them up:

```bash
cat > ../../.env <<EOF
SUPABASE_URL=$(terraform output -raw supabase_url)
SUPABASE_ANON_KEY=$(terraform output -raw publishable_api_key)
EOF
```

Then `expo start` — the client (`src/utils/supabaseClient.ts`) will read these
values from `Constants.expoConfig.extra`.

## Teardown

```bash
terraform destroy
```

This deletes the Supabase project. **All data is lost.** Use a separate
`terraform.tfvars` (or a workspace) for anything you care about.

## What to explore next (learning ideas)

- **Remote state** – uncomment the `backend "s3"` block in
  [versions.tf](versions.tf) and store state in S3/GCS/Terraform Cloud.
- **Workspaces** – `terraform workspace new staging` to get an isolated
  `staging` project side-by-side with `default`.
- **Modules** – extract `main.tf` + `settings.tf` into a reusable
  `modules/supabase-app` and instantiate it twice (staging/prod).
- **Schema as resources** – swap `null_resource.apply_schema` for the
  [`cyrilgdn/postgresql`](https://registry.terraform.io/providers/cyrilgdn/postgresql/latest)
  provider and model each table/policy as a Terraform resource.
- **CI/CD** – run `terraform plan` on PRs via GitHub Actions and gate
  `apply` behind a manual approval.
- **`for_each` / `count`** – provision extra API keys or storage buckets by
  iterating over a variable map.

## Troubleshooting

- **`Error: 401 Unauthorized`** – your `SUPABASE_ACCESS_TOKEN` is missing or
  expired.
- **`psql: command not found`** – install `libpq` (see prerequisites) or set
  `apply_schema = false` and run the SQL manually from the dashboard.
- **`connection refused` on `apply_schema`** – Supabase can take 60–120 s to
  finish provisioning DNS + Postgres; re-run `terraform apply` and the
  `null_resource` will retry.

