# Architecture and Data Flow

## Components

| Component | Responsibility |
|---|---|
| Browser UI | Captures details, reports validation errors, displays the success dialog and recent records |
| Express API | Security middleware, routing, validation and error responses |
| Student service | Normalizes and validates the business payload |
| Repository boundary | Keeps persistence separate from HTTP behavior |
| Mongo repository | Persists records with Mongoose in the `students` collection |
| Memory repository | Enables deterministic local development and automated tests |
| MongoDB Atlas | Production database with TLS connectivity and credentials |
| GitHub | Source control, pull requests and webhook source |
| Jenkins | Main CI/CD orchestrator and deployment gatekeeper |
| Terraform | Declarative Render service configuration |
| Render | Builds, runs, exposes and health-checks the web service |

## Runtime sequence

```mermaid
sequenceDiagram
    actor Student
    participant UI as Browser UI
    participant API as Express API
    participant V as Zod validation
    participant DB as MongoDB
    Student->>UI: Complete form and select Save
    UI->>API: POST /api/students
    API->>V: Validate and normalize payload
    alt invalid input
        V-->>API: Field errors
        API-->>UI: 400 validation response
        UI-->>Student: Show errors
    else valid input
        V-->>API: Safe student object
        API->>DB: Insert student
        alt duplicate student ID
            DB-->>API: Duplicate key
            API-->>UI: 409 conflict
        else inserted
            DB-->>API: Persisted student
            API-->>UI: 201 created
            UI->>API: GET /api/students
            UI-->>Student: Open popup and refresh table
        end
    end
```

## Failure boundaries

- Invalid form data is rejected before database access.
- Duplicate student IDs return `409` without overwriting a record.
- MongoDB connection failure prevents a production server from becoming ready.
- Any CI quality failure stops later deployment stages.
- Terraform apply is opt-in and manually approved.
- Live health failure marks the Jenkins build failed.
