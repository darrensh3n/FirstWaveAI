variable "table_name" {
  description = "Name of the DynamoDB table the lambda writes to"
  type        = string
}

variable "bucket_name" {
  description = "Name of the S3 bucket that triggers the lambda"
  type        = string
}

variable "bucket_arn" {
  description = "ARN of the S3 bucket that triggers the lambda"
  type        = string
}

variable "role_arn" {
  description = "ARN of the IAM role the lambda assumes"
  type        = string
}

variable "groq_api_key" {
  description = "Groq API key"
  type        = string
  sensitive   = true
}

variable "fish_audio_api_key" {
  description = "Fish Audio API key"
  type        = string
  sensitive   = true
}

variable "fish_audio_voice_id" {
  description = "Fish Audio voice ID (not secret)"
  type        = string
  default     = ""
}
