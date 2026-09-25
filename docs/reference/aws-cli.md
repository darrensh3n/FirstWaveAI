# AWS CLI reference (against LocalStack)

LocalStack ignores credential values but the CLI still refuses to sign a request with none at all. Pass dummy creds + a region:

```
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
  aws --endpoint-url=http://localhost:4566 --region us-west-2 s3 ls
```

Without them: `An error occurred (NoCredentials): Unable to locate credentials.`

## Named profile (avoids prefixing every command)

Needs AWS CLI v2.13+ (for `endpoint_url` in a profile):

```
aws configure set aws_access_key_id test --profile localstack
aws configure set aws_secret_access_key test --profile localstack
aws configure set region us-west-2 --profile localstack
aws configure set endpoint_url http://localhost:4566 --profile localstack
```

Then:
```
aws --profile localstack s3 ls
```
