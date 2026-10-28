# Render Terraform

This configuration provisions the student registry as a Render web service with
the official `render-oss/render` provider. Provider authentication comes from
`RENDER_API_KEY` and `RENDER_OWNER_ID`; MongoDB comes from the sensitive
`TF_VAR_mongodb_uri` variable.

The official provider currently supports paid web-service plans such as
`starter`. `terraform apply` can therefore create billable resources and must be
reviewed and manually approved. `render.yaml` provides a separate free-plan
Blueprint option for classroom demonstration.
