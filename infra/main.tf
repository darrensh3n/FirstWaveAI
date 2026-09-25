module "networking" {
  source = "./modules/networking"
}

module "storage" {
  source = "./modules/storage"
}

module "iam" {
  source = "./modules/iam"

  dynamodb_arn = module.storage.table_arn
  bucket_arn   = module.storage.bucket_arn
}

module "compute" {
  source = "./modules/compute"

  table_name  = module.storage.table_name
  bucket_name = module.storage.bucket_name
  bucket_arn  = module.storage.bucket_arn
  role_arn    = module.iam.role_arn

  groq_api_key        = var.groq_api_key
  fish_audio_api_key  = var.fish_audio_api_key
  fish_audio_voice_id = var.fish_audio_voice_id
}

output "bucket_name" {
  value = module.storage.bucket_name
}

output "table_name" {
  value = module.storage.table_name
}

output "lambda_function_name" {
  value = module.compute.lambda_function_name
}
