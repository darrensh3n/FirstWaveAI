resource "aws_s3_bucket" "uploads" {
  bucket = "firstwave-uploads"
}

output "bucket_name" {
  value = aws_s3_bucket.uploads.id
}
