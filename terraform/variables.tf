variable "service_name" {
  description = "Unique Render web service name."
  type        = string
  default     = "campusflow-student-registry"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,63}$", var.service_name))
    error_message = "service_name must contain lowercase letters, numbers and hyphens only."
  }
}

variable "repository_url" {
  description = "GitHub repository Render builds."
  type        = string
  default     = "https://github.com/shakthish-17/dev-ops"

  validation {
    condition     = can(regex("^https://github\\.com/[^/]+/[^/]+(?:\\.git)?$", var.repository_url))
    error_message = "repository_url must be an HTTPS GitHub repository URL."
  }
}

variable "branch" {
  description = "Git branch deployed to Render."
  type        = string
  default     = "main"
}

variable "region" {
  description = "Render service region."
  type        = string
  default     = "singapore"

  validation {
    condition     = contains(["frankfurt", "ohio", "oregon", "singapore", "virginia"], var.region)
    error_message = "region must be a supported Render region."
  }
}

variable "plan" {
  description = "Render plan managed by Terraform. The official provider currently requires a paid web-service plan."
  type        = string
  default     = "starter"

  validation {
    condition     = contains(["starter", "standard", "pro", "pro_plus", "pro_max", "pro_ultra"], var.plan)
    error_message = "plan must be supported by the Render Terraform provider."
  }
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string supplied securely by Jenkins."
  type        = string
  sensitive   = true

  validation {
    condition     = startswith(var.mongodb_uri, "mongodb://") || startswith(var.mongodb_uri, "mongodb+srv://")
    error_message = "mongodb_uri must be a MongoDB connection string."
  }
}

variable "mongodb_database" {
  description = "MongoDB database used by the application."
  type        = string
  default     = "student_registry"
}
