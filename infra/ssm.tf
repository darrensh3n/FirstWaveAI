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
