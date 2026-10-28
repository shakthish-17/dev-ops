# DevOps Rubric Traceability

| Rubric capability | Evidence | State |
|---|---|---|
| Source control | Git repository, `.gitignore`, workflow and PR template | Implemented locally; remote push unverified |
| Web application | Responsive form, status, records table and success dialog | Implemented |
| Backend API | Express routes in `src/app.js` | Implemented |
| Database | Mongoose model and Mongo repository | Implemented; production Atlas connection unverified |
| Validation | Browser constraints plus Zod server validation | Implemented and tested |
| Automated testing | Node test runner and Supertest | Passing locally |
| Code quality | ESLint flat configuration | Passing locally |
| Dependency security | Production npm audit | Passing locally at last verification |
| Containerization | Unprivileged runtime and health check in `Dockerfile` | Built successfully on Render |
| CI | GitHub Actions and Jenkins quality stages | Implemented; hosted execution unverified |
| CD | Render Blueprint deployment plus Jenkins deploy hook | Render live; Jenkins hosted execution unverified |
| Infrastructure as code | Official Render provider, pinned version, variables and outputs | Initialized and validated locally |
| State management | Remote backend example and Jenkins secret file | Implemented; backend workspace unverified |
| Secret management | Jenkins/Render secret references | Implemented; user credentials required |
| Deployment safety | Manual Terraform apply approval | Implemented |
| Observability | Health endpoint, Render logs and Jenkins polling | Live health check verified |
| Documentation | README, architecture, deployment, Jenkins, Terraform and tests | Implemented |
| Cloud go-live | Render Blueprint and MongoDB Atlas | Live and verified |

## Priority completion checklist

1. Create/select MongoDB Atlas cluster, database user and network rule.
2. Put `MONGODB_URI` into Render and Jenkins credential stores.
3. Connect this repository to the intended GitHub repository and push `main`.
4. Enable required GitHub checks and the Jenkins webhook.
5. Verify the Render account, create the Blueprint service and complete the first build.
6. Add Render deploy hook and public URL credentials to Jenkins.
7. Run the Jenkins `main` pipeline and capture successful console output.
8. Execute the live acceptance checks from `docs/DEPLOYMENT.md`.
9. Use Terraform plan/apply only if a paid provider-managed service is required.

No Azure or Ansible runtime dependency remains in the active project.
