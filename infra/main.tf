resource "aws_s3_bucket" "uploads" {
  bucket = "firstwave-uploads"
}

output "bucket_name" {
  value = aws_s3_bucket.uploads.id
}

resource "aws_dynamodb_table" "uploads_metadata" {
  name         = "uploads-metadata"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

output "table_name" {
  value = aws_dynamodb_table.uploads_metadata.name
}
