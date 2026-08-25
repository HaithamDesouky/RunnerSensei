# Applies infra/schema.sql to the freshly provisioned project by shelling out to
# `psql`. This is intentionally simple so the learning focus stays on Terraform
# resources; for a stricter setup, use the `cyrilgdn/postgresql` provider and
# model each table as a resource, or drive migrations from `supabase db push`.

locals {
  # Free-plan projects expose only IPv6 on the direct db.<ref>.supabase.co host,
  # so we go through the Supavisor session-mode pooler which is IPv4-reachable.
  # Session mode (port 5432) supports DDL; transaction mode (6543) does not.
  pooler_host = "aws-0-${var.region}.pooler.supabase.com"
  pooler_user = "postgres.${supabase_project.this.id}"
  db_url      = "postgresql://${local.pooler_user}:${local.db_password}@${local.pooler_host}:5432/postgres?sslmode=require"
}

resource "null_resource" "apply_schema" {
  count = var.apply_schema ? 1 : 0

  # Re-run whenever the SQL file or the project changes.
  triggers = {
    project_ref = supabase_project.this.id
    schema_sha  = filesha256(var.schema_file)
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = "psql \"$DB_URL\" -v ON_ERROR_STOP=1 -f \"$SCHEMA_FILE\""

    # Homebrew's libpq is keg-only, so prepend its bin dirs to PATH.
    environment = {
      DB_URL      = local.db_url
      SCHEMA_FILE = var.schema_file
      PGPASSWORD  = local.db_password
      PATH        = "/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:/usr/bin:/bin:/usr/local/bin"
    }
  }

  depends_on = [supabase_settings.this]
}
