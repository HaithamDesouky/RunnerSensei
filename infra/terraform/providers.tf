provider "supabase" {
  # Prefer setting SUPABASE_ACCESS_TOKEN in your shell instead of hardcoding.
  # Generate a personal access token: https://supabase.com/dashboard/account/tokens
  access_token = var.supabase_access_token
}
