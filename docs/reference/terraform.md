# Terraform reference

## Core commands

- `terraform init` — downloads provider plugins, sets up backend. Run once per config dir (and after provider/backend changes).
- `terraform plan` — dry run, shows what would change. Creates nothing.
- `terraform apply` — applies the plan, prompts `yes`. Creates/updates real (or LocalStack) resources.
- `terraform destroy` — tears down everything Terraform manages in the current state. Prompts `yes`.
- `terraform show` — prints current state in human-readable form.

## Provider block against LocalStack

```hcl
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
```

Add more `endpoints { ... }` entries per service as new resources are introduced (`dynamodb`, `iam`, `lambda`, etc.) — see `docs/reference/localstack.md` for endpoint conventions.

## State

`terraform.tfstate` is the source of truth Terraform diffs against — not the `.tf` files. `destroy` updates state; it never edits `.tf` files, so `apply` can always rebuild from them. Stage 7 covers moving state to a remote (S3) backend.
