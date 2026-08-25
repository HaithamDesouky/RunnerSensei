resource "supabase_settings" "this" {
  project_ref = supabase_project.this.id

  api = jsonencode({
    db_schema            = "public,storage,graphql_public"
    db_extra_search_path = "public,extensions"
    max_rows             = 1000
  })

  auth = jsonencode({
    site_url                 = var.site_url
    uri_allow_list           = join(",", var.additional_redirect_urls)
    jwt_exp                  = 3600
    refresh_token_rotation_enabled = true
    disable_signup           = false
    mailer_autoconfirm       = false
  })

  storage = jsonencode({
    # 5 MB per file – enough for avatars, tuneable later.
    fileSizeLimit = 5 * 1024 * 1024
    features = {
      # imageTransformation requires a paid plan; keep off for free tier.
      imageTransformation = { enabled = false }
      s3Protocol          = { enabled = false }
    }
  })
}
