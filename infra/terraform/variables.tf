variable "supabase_access_token" {
  description = "Personal access token for the Supabase Management API. Prefer SUPABASE_ACCESS_TOKEN env var."
  type        = string
  sensitive   = true
  default     = null
}

variable "organization_id" {
  description = "Supabase organization slug (visible in the dashboard URL)."
  type        = string
}

variable "project_name" {
  description = "Human-friendly name for the Supabase project."
  type        = string
  default     = "runnersensei"
}

variable "region" {
  description = "Region for the Supabase project (e.g. us-east-1, eu-west-1, ap-southeast-1)."
  type        = string
  default     = "us-east-1"
}

variable "instance_size" {
  description = "Compute size for the project. Leave null for free-plan orgs (they reject this field)."
  type        = string
  default     = null
}

variable "db_password" {
  description = "Password for the Postgres superuser (`postgres`). Leave null to auto-generate."
  type        = string
  sensitive   = true
  default     = null
}

variable "site_url" {
  description = "Public URL of the app; used for auth redirects."
  type        = string
  default     = "http://localhost:8081"
}

variable "additional_redirect_urls" {
  description = "Extra allowed OAuth/email redirect URLs."
  type        = list(string)
  default     = []
}

variable "apply_schema" {
  description = "Whether to run infra/schema.sql against the new project on apply. Requires `psql` on PATH."
  type        = bool
  default     = true
}

variable "schema_file" {
  description = "Path to the SQL schema file to apply."
  type        = string
  default     = "../schema.sql"
}
