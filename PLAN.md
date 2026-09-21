# FirstWaveAI — Project Plan

## Goal order

1. Learn Terraform + AWS, free, resume-worthy — using LocalStack (no real AWS account spend, no deploy target needed).
2. After that, upgrade app itself (features, code quality).

Rationale: app already dockerized (backend FastAPI, frontend Next.js, docker-compose) — used as the thing infra-as-code manages, but goal is the skill/resume line, not actually running this in production AWS.

---

## Phase 1: Terraform + AWS stack (LocalStack — $0, resume-worthy)

Use [LocalStack](https://localstack.cloud) (free tier — needs a free account and an
auth token since the community and pro images merged in 2026.3.0) in Docker. Point Terraform's `aws` provider at it via `endpoint` overrides + dummy credentials — same HCL as real AWS, zero cost, safe to break.

Resume line target: "Terraform, AWS (VPC, ECS/Fargate, S3, IAM, Lambda, DynamoDB), IaC, CI/CD."

- [ ] Run LocalStack via docker-compose, confirm `awslocal`/`tflocal` or provider endpoint override works
- [ ] Terraform CLI, core concepts: providers, resources, variables, outputs, state, modules
- [ ] Remote state: S3 backend + DynamoDB lock table
- [ ] IAM: roles, policies, least-privilege for a service
- [ ] Networking: VPC, subnets, security groups (community edition supports these)
- [ ] Storage/data: S3 buckets, DynamoDB tables
- [ ] Compute: Lambda function; ECS (Fargate) task/service if LocalStack community supports it well enough — else document as Pro-only gap
- [ ] Containerize this app's images conceptually as Terraform-managed ECR repos (LocalStack ECR support, or skip ECR and just show Dockerfile + task def wiring)
- [ ] Secrets: SSM Parameter Store for backend `.env` values
- [ ] Terraform modules: refactor above into a reusable module (shows structuring skill, not just single-file HCL)

Known gaps in free LocalStack (don't chase these, not worth cost): ALB, Route53, ACM — networking/LB edge is weak/paid-tier. Skip; not needed since there's no real deploy target.

Resources: Terraform docs (registry.terraform.io), LocalStack docs, "Terraform Up & Running" (optional book).

---

## Phase 2: Ops polish (still $0, still resume-worthy)

- [ ] CI/CD: GitHub Actions running `terraform plan`/`apply` against LocalStack in a CI job — real, showable pipeline, zero cost
- [ ] Environments: dev/prod split via Terraform workspaces or dir-per-env
- [ ] Write up: short README in a new `infra/` dir explaining the stack — this is often what resume/portfolio reviewers actually read

---

## Phase 3: App upgrades (after infra done)

- [ ] Review backend agents pipeline (`backend/agents`) for correctness/latency
- [ ] Frontend UX polish (`frontend/src`)
- [ ] Add tests (backend + frontend currently look untested)
- [ ] Revisit README's stated features vs actual implementation, close gaps

---

## Notes

- No real AWS account needed for Phase 1–2 — LocalStack covers the resume-worthy stack at $0.
- If later actually wanting a live deployed demo, that's a separate future decision (real AWS Free Tier) — not part of this plan.
