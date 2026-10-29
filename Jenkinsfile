pipeline {
    agent any

    options {
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '30'))
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
    }

    tools {
        nodejs 'node24'
    }

    triggers {
        githubPush()
    }

    parameters {
        booleanParam(name: 'TERRAFORM_PLAN', defaultValue: false,
            description: 'Create a real Render infrastructure plan.')
        booleanParam(name: 'TERRAFORM_APPLY', defaultValue: false,
            description: 'Apply the reviewed Render plan after manual approval. May create billable resources.')
        booleanParam(name: 'DEPLOY_TO_RENDER', defaultValue: false,
            description: 'Optional fallback deploy hook. Keep false when Render autoDeployTrigger is checksPass to avoid duplicate deployments.')
        string(name: 'REPOSITORY_URL', defaultValue: 'https://github.com/shakthish-17/dev-ops',
            description: 'GitHub repository Render should build.')
    }

    environment {
        CI = 'true'
        TF_IN_AUTOMATION = 'true'
        TF_INPUT = 'false'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Preflight') {
            steps {
                sh '''
                    set -eu
                    node --version
                    npm --version
                    terraform version
                    test -f package-lock.json
                    test -f Dockerfile
                    test -f terraform/main.tf
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci --no-audit --no-fund'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports
                    npm run test:ci
                '''
            }
            post {
                always {
                    junit testResults: 'reports/junit.xml', allowEmptyResults: false
                }
            }
        }

        stage('Dependency Security Audit') {
            steps {
                sh 'npm audit --omit=dev --audit-level=high'
            }
        }

        stage('Package') {
            steps {
                sh '''
                    set -eu
                    mkdir -p artifacts
                    npm pack --pack-destination artifacts
                '''
            }
        }

        stage('Terraform Format and Validate') {
            steps {
                dir('terraform') {
                    sh '''
                        set -eu
                        terraform fmt -check -recursive
                        terraform init -backend=false
                        terraform validate
                    '''
                }
            }
        }

        stage('Terraform Plan') {
            when {
                expression { params.TERRAFORM_PLAN || params.TERRAFORM_APPLY }
            }
            steps {
                withCredentials([
                    string(credentialsId: 'render-api-key', variable: 'RENDER_API_KEY'),
                    string(credentialsId: 'render-owner-id', variable: 'RENDER_OWNER_ID'),
                    string(credentialsId: 'mongodb-uri', variable: 'TF_VAR_mongodb_uri'),
                    file(credentialsId: 'terraform-backend-config', variable: 'TF_BACKEND_CONFIG')
                ]) {
                    dir('terraform') {
                        sh '''
                            set -eu
                            export TF_VAR_repository_url="$REPOSITORY_URL"
                            terraform init -reconfigure -backend-config="$TF_BACKEND_CONFIG"
                            terraform plan -out=tfplan
                            terraform show -no-color tfplan > tfplan.txt
                        '''
                    }
                }
            }
        }

        stage('Approve Render Infrastructure') {
            when {
                expression { params.TERRAFORM_APPLY }
            }
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    input message: 'Apply the reviewed Render Terraform plan? This can create billable resources.', ok: 'Apply'
                }
            }
        }

        stage('Terraform Apply') {
            when {
                expression { params.TERRAFORM_APPLY }
            }
            steps {
                withCredentials([
                    string(credentialsId: 'render-api-key', variable: 'RENDER_API_KEY'),
                    string(credentialsId: 'render-owner-id', variable: 'RENDER_OWNER_ID'),
                    string(credentialsId: 'mongodb-uri', variable: 'TF_VAR_mongodb_uri'),
                    file(credentialsId: 'terraform-backend-config', variable: 'TF_BACKEND_CONFIG')
                ]) {
                    dir('terraform') {
                        sh 'terraform apply tfplan'
                    }
                }
            }
        }

        stage('Deploy to Render') {
            when {
                allOf {
                    branch 'main'
                    expression { params.DEPLOY_TO_RENDER }
                }
            }
            steps {
                withCredentials([
                    string(credentialsId: 'render-deploy-hook-url', variable: 'RENDER_DEPLOY_HOOK_URL')
                ]) {
                    sh '''
                        set -eu
                        curl --fail --silent --show-error --get \
                          --data-urlencode "ref=$GIT_COMMIT" \
                          "$RENDER_DEPLOY_HOOK_URL"
                    '''
                }
            }
        }

        stage('Live Health Verification') {
            when {
                allOf {
                    branch 'main'
                    expression { params.DEPLOY_TO_RENDER }
                }
            }
            steps {
                withCredentials([
                    string(credentialsId: 'render-app-url', variable: 'RENDER_APP_URL')
                ]) {
                    sh '''
                        set -eu
                        for attempt in $(seq 1 30); do
                          if curl --fail --silent --show-error "$RENDER_APP_URL/api/health" | grep '"status":"UP"'; then
                            exit 0
                          fi
                          sleep 10
                        done
                        echo 'Render service did not become healthy in time.' >&2
                        exit 1
                    '''
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'artifacts/*.tgz,terraform/tfplan.txt', fingerprint: true, allowEmptyArchive: true
            echo "Pipeline result: ${currentBuild.currentResult}"
        }
        failure {
            echo 'Pipeline failed; Render deployment was not promoted past the failed prerequisite.'
        }
        success {
            echo 'Build, validation, selected infrastructure and deployment stages succeeded.'
        }
        cleanup {
            deleteDir()
        }
    }
}
