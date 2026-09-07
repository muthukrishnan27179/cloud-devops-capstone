variable "aws_region" {
  description = "Target AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name (staging/production)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "docker_image" {
  description = "Docker image repository and tag for CloudPulse"
  type        = string
  default     = "ghcr.io/muthukrishnan27179/cloudpulse-platform:latest"
}

variable "ecs_execution_role_arn" {
  description = "IAM Execution Role ARN for ECS Tasks"
  type        = string
  default     = "arn:aws:iam::123456789012:role/ecsTaskExecutionRole"
}
