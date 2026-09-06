# Floework Infrastructure as Code (Terraform)

Modular Terraform specifications for Floework's AWS infrastructure foundation.

## Directory Structure

```text
terraform/
├── environments/
│   └── staging/                 # Staging environment composition
│       ├── main.tf              # Provider & module wiring
│       ├── variables.tf         # Staging input declarations
│       ├── outputs.tf           # Foundation outputs for RDS/ECS
│       └── terraform.tfvars.example
├── modules/
│   ├── networking/              # VPC, Dual-AZ Subnets, Route Tables, NAT, S3 Endpoint
│   ├── security/                # Security Groups, KMS Customer Managed Key, IAM Roles
│   └── secrets/                 # SSM Parameter Store hierarchy
└── README.md
```

## Security & Network Boundaries

1. **Dual-AZ Topology (`us-east-1a`, `us-east-1b`)**:
   - `Public Subnets` (`10.0.1.0/24`, `10.0.2.0/24`): ALB & NAT Gateway placement only.
   - `Private App Subnets` (`10.0.10.0/24`, `10.0.11.0/24`): ECS Fargate containers. Outbound traffic routes through NAT Gateway.
   - `Private Data Subnets` (`10.0.20.0/24`, `10.0.21.0/24`): Amazon RDS PostgreSQL and ElastiCache Redis. **Zero internet gateway or NAT route** (strictly isolated).

2. **Chained Least-Privilege Ingress**:
   - `Internet` -> Port 80/443 -> `ALB SG`
   - `ALB SG` -> Port 3000 -> `ECS SG`
   - `ECS SG` -> Port 5432 -> `RDS SG`
   - `ECS SG` -> Port 6379 -> `Redis SG`

3. **Data Protection**:
   - Dedicated AWS KMS Customer Managed Key (CMK) with automated key rotation.
   - Systems Manager (SSM) Parameter Store hierarchy (`/floework/staging/app/*`) encrypting all backend secrets.

## Deployment Instructions

### Prerequisites
- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5.0 (or OpenTofu)
- AWS CLI configured with staging deployment credentials (`aws configure`)

### Running Staging Setup

```bash
cd terraform/environments/staging

# 1. Initialize Terraform plugins
terraform init

# 2. Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# (Edit terraform.tfvars with real staging parameters)

# 3. Dry-run plan verification
terraform plan

# 4. Apply infrastructure
terraform apply
```

### Rollback / Teardown

```bash
terraform destroy
```
