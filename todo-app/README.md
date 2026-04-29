# Todo App CI/CD (GitHub Actions + Docker CLI)

This project provides a Todo application structure with:
- `backend` (Node.js + Express + Socket.IO + PostgreSQL via `pg`)
- `frontend` (static app served by Nginx)
- CI/CD pipeline in GitHub Actions
- Docker image publishing to Docker Hub

The pipeline uses **plain Docker CLI** commands (`docker build`, `docker run`, `docker network`, `docker stop`, `docker rm`, `docker rmi`) and **does not use Docker Compose**.

## GitHub Secrets Setup

1. Create Docker Hub Access Token:
   - Open [https://hub.docker.com](https://hub.docker.com)
   - Go to **Account** -> **My Account** -> **Security**
   - Click **New Access Token**
   - Name it `github-actions`
   - Copy the generated token

2. Add secrets to GitHub repository:
   - Open your repository -> **Settings**
   - Go to **Secrets and variables** -> **Actions**
   - Click **New repository secret**
   - Add:
     - `DOCKER_USERNAME` = your Docker Hub username (for example `johndoe`)
     - `DOCKER_TOKEN` = token from step 1 (**not** your Docker Hub password)

3. Trigger the pipeline:
   - `git add .`
   - `git commit -m "feat: add CI/CD GitHub Actions pipeline"`
   - `git push origin main`

4. View results:
   - Open repository -> **Actions** tab
   - Select the latest workflow run

## Теоретическая часть — Основы CI/CD

CI/CD means Continuous Integration and Continuous Delivery/Deployment, where each code change is automatically checked, tested, and prepared for release. GitHub Actions is a convenient CI/CD platform because workflows are stored directly in the repository and run on managed runners. In this project, the process follows the model: event (`push`/`pull_request`) -> trigger -> jobs -> steps on an Ubuntu runner. This creates a repeatable, automated quality gate before publishing artifacts.

## Теоретическая часть — Docker без Compose

Without Compose, containers are managed explicitly through Docker CLI commands such as `docker build`, `docker run`, and `docker network create`. The backend and frontend images are built separately, then started with `docker run` and connected through a shared Docker network. Since PostgreSQL in CI is provided as a GitHub Actions service container on the runner host, backend reaches it via `host.docker.internal`. The flag `--add-host=host.docker.internal:host-gateway` maps this hostname inside the container to the host gateway so the backend can connect to the DB on port `5432`.

## Ход выполнения — Flow Description

After `git push`, the workflow starts automatically. Job 1 performs dependency install, syntax check, and optional tests against PostgreSQL service container. Job 2 builds Docker images, creates a network, runs backend/frontend containers, performs seven `curl` integration checks, and then always cleans up containers, network, and test images. If the branch is `main`, Job 3 logs in to Docker Hub and publishes backend/frontend images with both `sha-*` and `latest` tags.

## Выводы

The implementation delivers a full CI/CD pipeline for a Todo web application with database-backed integration validation. It automates code validation, container image build, runtime checks, and artifact publication to Docker Hub. This reduces manual deployment risk and ensures every change is verified in a consistent environment. In real projects, such a pipeline improves release speed, reliability, and traceability of delivered versions.
