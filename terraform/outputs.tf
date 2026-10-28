output "service_id" {
  description = "Render web service ID."
  value       = render_web_service.student_registry.id
}

output "service_url" {
  description = "Public Render application URL."
  value       = render_web_service.student_registry.url
}

output "service_slug" {
  description = "Render service slug."
  value       = render_web_service.student_registry.slug
}
