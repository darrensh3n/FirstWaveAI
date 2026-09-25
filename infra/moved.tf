moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.main
}

moved {
  from = aws_subnet.public
  to   = module.networking.aws_subnet.public
}

moved {
  from = aws_subnet.private
  to   = module.networking.aws_subnet.private
}

moved {
  from = aws_internet_gateway.main
  to   = module.networking.aws_internet_gateway.main
}

moved {
  from = aws_route_table.public
  to   = module.networking.aws_route_table.public
}

moved {
  from = aws_route_table_association.public
  to   = module.networking.aws_route_table_association.public
}

moved {
  from = aws_security_group.app
  to   = module.networking.aws_security_group.app
}

moved {
  from = aws_s3_bucket.uploads
  to   = module.storage.aws_s3_bucket.uploads
}

moved {
  from = aws_dynamodb_table.uploads_metadata
  to   = module.storage.aws_dynamodb_table.uploads_metadata
}

moved {
  from = aws_iam_role.lambda_exec
  to   = module.iam.aws_iam_role.lambda_exec
}

moved {
  from = aws_iam_role_policy.lambda_exec
  to   = module.iam.aws_iam_role_policy.lambda_exec
}

moved {
  from = aws_lambda_function.uploads_metadata
  to   = module.compute.aws_lambda_function.uploads_metadata
}

moved {
  from = aws_lambda_permission.allow_s3
  to   = module.compute.aws_lambda_permission.allow_s3
}

moved {
  from = aws_s3_bucket_notification.uploads
  to   = module.compute.aws_s3_bucket_notification.uploads
}

moved {
  from = aws_ssm_parameter.groq_api_key
  to   = module.compute.aws_ssm_parameter.groq_api_key
}

moved {
  from = aws_ssm_parameter.fish_audio_api_key
  to   = module.compute.aws_ssm_parameter.fish_audio_api_key
}

moved {
  from = aws_ssm_parameter.fish_audio_voice_id
  to   = module.compute.aws_ssm_parameter.fish_audio_voice_id
}
