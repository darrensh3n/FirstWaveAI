variable "dynamodb_arn" {
  description = "ARN of the DynamoDB table the lambda writes to"
  type        = string
}

variable "bucket_arn" {
  description = "ARN of the S3 bucket the lambda reads from"
  type        = string
}
