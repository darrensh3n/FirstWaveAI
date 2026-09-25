resource "aws_s3_bucket" "uploads" {
  bucket = "firstwave-uploads"
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
