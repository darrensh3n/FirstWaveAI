output "bucket_name" {
  value = aws_s3_bucket.uploads.id
}

output "bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "table_name" {
  value = aws_dynamodb_table.uploads_metadata.name
}

output "table_arn" {
  value = aws_dynamodb_table.uploads_metadata.arn
}
