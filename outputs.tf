output "alb_dns_name" {
  description = "Public Load Balancer DNS Endpoint"
  value       = aws_lb.app_alb.dns_name
}

output "vpc_id" {
  description = "Created VPC Identifier"
  value       = aws_vpc.main.id
}

output "ecs_cluster_name" {
  description = "Name of ECS Cluster"
  value       = aws_ecs_cluster.main.name
}
