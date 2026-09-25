# LocalStack reference

## Auth token (required as of 2026)

LocalStack merged the community and pro images into one as of 2026.3.0. `localstack/localstack:latest` refuses to start without a token — container exits with code 55 and logs "License activation failed! No credentials were found in the environment." Free tier is still free, but needs an account.

Sign up at https://app.localstack.cloud, copy the auth token, put it in a gitignored root `.env`:

```
LOCALSTACK_AUTH_TOKEN=ls-xxxxxxxx
```

`docker-compose.yml` reads it via `${LOCALSTACK_AUTH_TOKEN:?...}`, so a missing token fails at `docker compose config` time with a clear message instead of a mystery exit 55. Never commit the token — root `.env` is gitignored.

Alternative if you want to avoid the account: pin `localstack/localstack:4.4.0`, the last pre-merge community release. Frozen 2025 feature set — the `lstk` CLI notes below won't apply.

## Health check

```
curl http://localhost:4566/_localstack/health
```
Expect JSON with each service's status, e.g. `"s3": "available"`.

## CLI tooling

The old `awslocal`/`tflocal`/`samlocal`/`cdklocal` Python wrappers are deprecated — as of 2026-09-08 LocalStack replaced them with a single Go binary, `lstk`. Equivalent of `awslocal s3 ls` is `lstk awslocal s3 ls`.

## Known free-tier gaps

ALB, Route53, ACM — networking/LB edge is weak or paid-tier. Not worth chasing since there's no real deploy target.

## Endpoints

- Most services: `http://localhost:4566`
- S3 (virtual-hosted-style): `http://s3.localhost.localstack.cloud:4566`
