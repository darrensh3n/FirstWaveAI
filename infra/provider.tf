terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
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
  }
}
