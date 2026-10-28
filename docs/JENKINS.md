# Jenkins Configuration

## Required agent tools

- NodeJS plugin tool named `node24`
- Terraform on `PATH`
- Git and `curl`
- A Linux agent or compatible environment because pipeline shell steps use POSIX syntax

## Credential mapping

| ID | Type | Scope |
|---|---|---|
| `render-api-key` | Secret text | Terraform plan/apply |
| `render-owner-id` | Secret text | Terraform plan/apply |
| `mongodb-uri` | Secret text | Terraform sensitive variable |
| `terraform-backend-config` | Secret file | Remote-state configuration |
| `render-deploy-hook-url` | Secret text | Main branch deploy hook |
| `render-app-url` | Secret text | Live health verification |

## Parameters

- `TERRAFORM_PLAN`: plans infrastructure without applying it.
- `TERRAFORM_APPLY`: creates a plan, pauses for human approval and applies it.
- `DEPLOY_TO_RENDER`: triggers application deployment after all gates pass on `main`.
- `REPOSITORY_URL`: repository Terraform configures Render to build.

Normal releases should leave Terraform parameters false and deploy through the Render hook. Enable Terraform only for infrastructure changes.

## Pipeline gates

```text
Checkout → Preflight → Install → Lint → Test → Audit → Package
         → Terraform format/validate
         → optional plan → optional approval/apply
         → Render deploy hook → live health check
```

The test stage publishes JUnit results. The package stage creates an npm tarball, and the post section archives the tarball and readable Terraform plan when present.
