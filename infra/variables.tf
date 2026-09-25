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
