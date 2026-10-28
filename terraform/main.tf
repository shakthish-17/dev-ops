resource "render_web_service" "student_registry" {
  name              = var.service_name
  plan              = var.plan
  region            = var.region
  health_check_path = "/api/health"
  start_command     = "npm start"

  runtime_source = {
    native_runtime = {
      auto_deploy   = false
      branch        = var.branch
      build_command = "npm ci --omit=dev"
      repo_url      = var.repository_url
      runtime       = "node"
    }
  }

  env_vars = {
    NODE_ENV = {
      value = "production"
    }
    MONGODB_DATABASE = {
      value = var.mongodb_database
    }
    MONGODB_URI = {
      value = var.mongodb_uri
    }
  }

  previews = {
    generation = "off"
  }

  notification_override = {
    notifications_to_send         = "failure"
    preview_notifications_enabled = "false"
  }
}
