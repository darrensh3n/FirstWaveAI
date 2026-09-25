data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.root}/lambda/handler.py"
  output_path = "${path.root}/lambda/handler.zip"
}

resource "aws_lambda_function" "uploads_metadata" {
  function_name    = "uploads-metadata-writer"
  role             = var.role_arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "handler.handler"
  runtime          = "python3.12"
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME            = var.table_name
      DYNAMODB_ENDPOINT_URL = "http://host.docker.internal:4566"
      S3_ENDPOINT_URL       = "http://host.docker.internal:4566"
    }
  }
}

resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.uploads_metadata.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.bucket_arn
}

resource "aws_s3_bucket_notification" "uploads" {
  bucket = var.bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.uploads_metadata.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.allow_s3]
}

resource "aws_ssm_parameter" "groq_api_key" {
  name  = "/firstwave/backend/GROQ_API_KEY"
  type  = "SecureString"
  value = var.groq_api_key
}

resource "aws_ssm_parameter" "fish_audio_api_key" {
  name  = "/firstwave/backend/FISH_AUDIO_API_KEY"
  type  = "SecureString"
  value = var.fish_audio_api_key
}

resource "aws_ssm_parameter" "fish_audio_voice_id" {
  name  = "/firstwave/backend/FISH_AUDIO_VOICE_ID"
  type  = "String"
  value = var.fish_audio_voice_id
}
