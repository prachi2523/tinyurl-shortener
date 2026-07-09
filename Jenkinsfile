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
                sh 'docker build -t tinyurl-shortener:latest .'
            }
        }

        // stage('Start Application') {

        //     agent any

        //     steps {
        //         sh 'docker compose up -d'
        //     }
        // }

        // stage('Verify Running Containers') {

        //     agent any

        //     steps {
        //         sh 'docker ps'
        //     }
        // }

    }

    post {

        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed.'
        }

        always {
            sh 'docker compose down'
        }

    }

}