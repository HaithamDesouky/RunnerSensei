resource "supabase_apikey" "publishable" {
  project_ref = supabase_project.this.id
  name        = "expo_client"
}
