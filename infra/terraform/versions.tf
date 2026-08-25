terraform {
  required_version = ">= 1.6.0"

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.10"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }

    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }

    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }

  # For learning, we keep state on disk.
  # For teams, switch to a remote backend (e.g. S3, Terraform Cloud, GCS):
  #
  # backend "s3" {
  #   bucket = "runnersensei-tfstate"
  #   key    = "supabase/terraform.tfstate"
  #   region = "us-east-1"
  # }
}
