terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    render = {
      source  = "render-oss/render"
      version = "1.9.1"
    }
  }

  backend "remote" {}
}
