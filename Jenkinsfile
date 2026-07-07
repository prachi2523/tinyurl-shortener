pipeline {

    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('List Workspace') {
            steps {
                sh 'pwd'
                sh 'ls -la'
            }
        }

        stage('Install') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }
}
// pipeline {

//     agent any

//     stages {

//         stage('Checkout') {
//             steps {
//                 checkout scm
//             }
//         }

//         stage('Build Docker Image') {
//             steps {
//                 sh 'docker compose build'
//             }
//         }

//         stage('Start Services') {
//             steps {
//                 sh 'docker compose up -d'
//             }
//         }

//         stage('Verify Containers') {
//             steps {
//                 sh 'docker ps'
//             }
//         }
//     }

//     post {
//         always {
//             sh 'docker compose down'
//         }
//     }
// }