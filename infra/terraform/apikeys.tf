# The `supabase_apikey` resource ONLY creates *secret* (server-side) keys.
# The client-side *publishable* key is auto-provisioned with the project and
# is read via the data source in `apikeys_data.tf`, not created here.
resource "supabase_apikey" "server_secret" {
  project_ref = supabase_project.this.id
  name        = "expo_server"
}
