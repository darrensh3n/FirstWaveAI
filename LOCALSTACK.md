Stage 1
Docker
  ↓
LocalStack
  ↓
Terraform
  ↓
S3

Stage 2
S3 + DynamoDB

Stage 3
IAM

Stage 4
Lambda

Stage 5
VPC + subnets + security groups

Stage 6
SSM parameters

Stage 7
Terraform remote state

Stage 8
modules

Stage 9
CI/CD

Stage 10
ECR/ECS concepts

Stage 1 — Local infrastructure foundation
Goal: get comfortable with the toolchain itself. Set up Docker, LocalStack, Terraform, and one S3 bucket. Learn what init, plan, apply, destroy, provider, resource, state, variable, and output mean.
Done when: you can start LocalStack, create S3 with Terraform, inspect it, destroy it, and explain every step.
Stage 2 — Application data layer
Goal: understand the difference between object storage and database storage. Keep S3 for files and add DynamoDB for structured application data.
Done when: your app can conceptually say “file goes to S3, metadata/record goes to DynamoDB,” and you understand keys, tables, items, and basic access patterns.
Stage 3 — Permissions and identity
Goal: stop thinking of cloud resources as globally accessible. Add IAM roles and least-privilege policies for the backend/Lambda.
Done when: you can explain which service is allowed to access which bucket/table and why you should avoid broad * permissions.
Stage 4 — Event-driven compute
Goal: understand serverless execution. Add a Lambda that performs one small useful task, ideally tied to your app.
Example: upload to S3 → Lambda processes metadata → writes to DynamoDB.
Done when: you understand events, handlers, execution roles, logs, and when Lambda makes sense versus a normal backend server.
Stage 5 — Networking
Goal: understand how AWS resources communicate securely. Add a VPC, subnets, route concepts, and security groups.
Done when: you can explain VPC vs subnet vs route table vs security group, and which resources should be public or private.
Stage 6 — Configuration and secrets
Goal: remove environment-specific values from source code. Add SSM Parameter Store for configuration and secret-like values.
Done when: your app reads configuration from the environment/SSM rather than hardcoded values, and you understand why secrets should not live in Git or Terraform state.
Stage 7 — Terraform state architecture
Goal: understand how Terraform itself is managed in a team environment. Move from local state toward an S3-backed state model and learn locking.
Done when: you understand why state matters, why teams need shared state, and why simultaneous applies are dangerous.
Stage 8 — Terraform structure and modules
Goal: refactor working infrastructure instead of building abstractions too early. Split networking, storage, IAM, and compute into reusable modules.
Done when: the root Terraform config is small and readable, and you understand module inputs, outputs, and dependencies.
Stage 9 — CI/CD and validation
Goal: make infrastructure changes repeatable and safer. Add automated terraform fmt, validate, tests, and optionally a LocalStack-based plan/test workflow in GitHub Actions.
Done when: every push can automatically verify that your infrastructure code is valid before merging.
Stage 10 — Containers and real deployment architecture
Goal: connect your application container to AWS-style deployment concepts. Dockerize the backend properly and learn ECR, ECS, task definitions, services, and Fargate. If LocalStack free tier limits this, document the architecture rather than forcing emulation.
Done when: you can explain the flow: code → Docker image → ECR → ECS task/service → Fargate.
Stage 11 — Production hardening
Goal: make the architecture look like something you would actually deploy. Add logging, tagging, environment separation, health checks, sensible IAM boundaries, backup considerations, and failure handling.
Done when: you can explain how dev/staging/prod would differ and what would need to change before using real AWS.
Stage 12 — Real AWS migration plan
Goal: prove that LocalStack was a development environment, not the final architecture. Document exactly what would change to deploy to AWS: real credentials, provider endpoints removed, remote state bucket, secrets handling, real ECS/ECR, networking, monitoring, and cost controls.
Done when: you could migrate the project to AWS without redesigning it from scratch.

Stage 1 — your step list

0. Install AWS CLI (needed for step 8 verification)
brew install awscli
Verify:
aws --version

1. Install Terraform
The terraform formula was removed from homebrew-core (BUSL license change) — `brew install terraform` now errors with "No available formula". Use the official HashiCorp tap:
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
Verify:
terraform -version
Expect: version output (1.16.3 or later), no error.
Later upgrades: brew upgrade hashicorp/tap/terraform

2. Add LocalStack to docker-compose.yml
I'll propose the diff, you review/apply (say when ready — this is a file edit, want your go-ahead before I write it).

3. Start LocalStack
docker compose up -d localstack
Verify container healthy:
docker compose ps
curl http://localhost:4566/_localstack/health
Expect: JSON showing "s3": "available" (or "running").

4. Create infra/ dir, provider.tf, main.tf
I'll write these once you say go — will explain each block before writing.
Provider block targets LocalStack manually (writing it by hand rather than using the `lstk terraform` wrapper, since the point of Stage 1 is understanding what `provider` does):

provider "aws" {
  access_key                  = "test"
  secret_key                  = "test"
  region                      = "us-east-1"
  skip_credentials_validation = true
  skip_metadata_api_check     = true

  endpoints {
    s3 = "http://s3.localhost.localstack.cloud:4566"
  }
}

Note: S3 needs the s3.localhost.localstack.cloud hostname for virtual-hosted-style addressing. Other services use plain http://localhost:4566.

5. terraform init
Run inside infra/. Downloads AWS provider plugin. Expect: "Terraform has been successfully initialized!"

6. terraform plan
Shows 1 resource to add (the S3 bucket). Nothing created yet — dry run.

7. terraform apply
Type yes when prompted. Creates bucket inside LocalStack.

8. Verify bucket exists — two ways
aws --endpoint-url=http://localhost:4566 s3 ls
(needs the aws CLI from step 0. The old `awslocal` wrapper is deprecated — as of 2026-09-08 LocalStack replaced the Python localstack CLI and all its wrappers (awslocal, tflocal, samlocal, cdklocal) with a single Go binary, `lstk`. If you install it, the equivalent is `lstk awslocal s3 ls`.)
or check state:
terraform show
Expect: bucket name listed either way.

9. terraform destroy
Type yes. Confirm bucket gone via same aws s3 ls command — expect empty.