# Deployment Runbook

## 1. Prepare MongoDB Atlas

1. Create or select an Atlas project and cluster.
2. Create a least-privilege database user for the application.
3. Configure Network Access for Render connectivity according to your organization policy.
4. Copy the application connection string and replace its placeholders.
5. Store the string directly in Render and Jenkins; never commit it or paste it into logs.

The target database defaults to `student_registry`, and Mongoose creates the `students` collection on first use.

## 2. Publish source to GitHub

Use `main` as the production branch. Protect it by requiring the GitHub `quality` check before merge. Jenkins can remain an additional optional check; it is not required for the default Render deployment path.

If Jenkins is used, configure a GitHub webhook at:

```text
https://YOUR_JENKINS_HOST/github-webhook/
```

Select JSON content type and the push event. The Jenkins job should be a Pipeline or Multibranch Pipeline that reads `Jenkinsfile` from source control.

## 3. Create Render service

### Free Blueprint path

1. In Render, select **New → Blueprint**.
2. Connect the GitHub repository and select `main`.
3. Confirm the service described by `render.yaml`.
4. Enter the `MONGODB_URI` secret when prompted.
5. Verify Auto-Deploy is **After CI Checks Pass**, matching `autoDeployTrigger: checksPass`.
6. Deploy and wait for `/api/health` to report `UP` with database mode `mongodb`.

### Terraform path

The Terraform provider path defaults to Render's paid `starter` plan. Configure credentials, initialize remote state, review the plan and approve the Jenkins input before apply. Do not run an unreviewed apply.

## 4. Optional Jenkins fallback deployment

The default path is GitHub Actions followed by Render's **After CI Checks Pass** trigger. This requires no deploy-hook secret. If an organization deliberately uses Jenkins as the deployment controller instead:

1. Set the Render service Auto-Deploy setting to **Off** to prevent duplicates.
2. Create a Render deploy hook for the existing service.
3. Store the full hook as Jenkins secret text `render-deploy-hook-url`.
4. Store the public origin as `render-app-url`.
5. Run the `main` branch pipeline with `DEPLOY_TO_RENDER=true`.
6. Verify Jenkins triggers the exact `GIT_COMMIT` and the health stage succeeds.

## 5. Acceptance checks

- `/api/health` returns HTTP 200 and database mode `mongodb`.
- The home page loads over HTTPS without browser console errors.
- A unique student submission displays the success popup.
- Refreshing the page retains the record.
- Reusing the same student ID produces a clear duplicate message.
- Invalid fields never create a record.
- Render logs contain no database URI or credential.

## Rollback

Render retains deploy history. Roll back to the last successful deploy from the dashboard, or redeploy a known-good Git commit through the deploy hook. A source rollback does not delete MongoDB data.
