resource "random_password" "db" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}"
}

locals {
  db_password = coalesce(var.db_password, random_password.db.result)
}

resource "supabase_project" "this" {
  organization_id   = var.organization_id
  name              = var.project_name
  region            = var.region
  database_password = local.db_password

  # Omitted entirely on free plan; paid orgs can set var.instance_size.
  instance_size = var.instance_size

  # Project provisioning can take several minutes.
  timeouts {
    create = "30m"
  }
}
