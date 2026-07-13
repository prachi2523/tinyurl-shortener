pipeline {
    agent none

    stages {

        stage('Checkout') {
            agent any
            steps {
                checkout scm
                sh 'pwd'
                sh 'ls -la'
            }
        }

        stage('Build Application') {
            agent {
                docker {
                    image 'node:22-alpine'
                    reuseNode true
                }
            }
            steps {
                sh 'node --version'
                sh 'npm --version'
                sh 'npm install'
                sh 'npm run build'
            }
        }

        stage('Build Docker Image') {
            agent any
            steps {
                sh 'docker compose build'
            }
        }

        stage('Run Application') {
            agent any
            steps {
                sh 'docker rm -f tinyurl_app_test || true'
                sh 'docker compose down -v || true'
                sh 'docker compose up -d'
            }
        }

        stage('Verify') {
            agent any
            steps {
                sh 'docker compose ps'
                sh 'sleep 5'
                sh 'curl http://localhost:3000 || true'
            }
        }
    }

    post {
        always {
            script {
                sh 'docker compose down -v || true'
            }
        }
    }
}