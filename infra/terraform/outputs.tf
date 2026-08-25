output "project_ref" {
  description = "Supabase project reference (used as subdomain: <ref>.supabase.co)."
  value       = supabase_project.this.id
}

output "supabase_url" {
  description = "Public REST/Auth URL for the project."
  value       = "https://${supabase_project.this.id}.supabase.co"
}

output "publishable_api_key" {
  description = "Publishable API key for the Expo client (put in SUPABASE_ANON_KEY)."
  value       = supabase_apikey.publishable.api_key
  sensitive   = true
}

output "db_password" {
  description = "Postgres superuser password. Store securely."
  value       = local.db_password
  sensitive   = true
}

output "db_connection_string" {
  description = "Supavisor session-mode pooler connection string (IPv4, sslmode=require)."
  value       = local.db_url
  sensitive   = true
}
