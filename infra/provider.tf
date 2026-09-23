terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  access_key                  = "test"
  secret_key                  = "test"
  region                      = "us-west-2"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    s3        = "http://s3.localhost.localstack.cloud:4566"
    s3control = "http://localhost.localstack.cloud:4566"
    dynamodb  = "http://localhost:4566"
    iam       = "http://localhost:4566"
    lambda    = "http://localhost:4566"
    ec2       = "http://localhost:4566"
    ssm       = "http://localhost:4566"
  }
}
