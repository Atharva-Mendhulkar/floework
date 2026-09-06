# ==============================================================================
# VPC & Core Networking
# ==============================================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-vpc"
    Environment = var.environment
  })
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-igw"
    Environment = var.environment
  })
}

# ==============================================================================
# Subnets: Public (ALB, Ingress, NAT)
# ==============================================================================

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-public-${var.availability_zones[count.index]}"
    Type        = "public"
    Environment = var.environment
  })
}

# ==============================================================================
# Subnets: Private Application (ECS Fargate)
# ==============================================================================

resource "aws_subnet" "private_app" {
  count             = length(var.private_app_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_app_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-private-app-${var.availability_zones[count.index]}"
    Type        = "private-app"
    Environment = var.environment
  })
}

# ==============================================================================
# Subnets: Private Data (RDS PostgreSQL & ElastiCache Redis - Isolated)
# ==============================================================================

resource "aws_subnet" "private_data" {
  count             = length(var.private_data_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_data_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-private-data-${var.availability_zones[count.index]}"
    Type        = "private-data"
    Environment = var.environment
  })
}

# ==============================================================================
# Elastic IPs & NAT Gateways (Single NAT for staging, Multi-AZ for prod)
# ==============================================================================

resource "aws_eip" "nat" {
  count  = var.enable_multi_az_nat ? length(var.availability_zones) : 1
  domain = "vpc"

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
    Environment = var.environment
  })
}

resource "aws_nat_gateway" "nat" {
  count         = var.enable_multi_az_nat ? length(var.availability_zones) : 1
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-nat-${count.index + 1}"
    Environment = var.environment
  })

  depends_on = [aws_internet_gateway.gw]
}

# ==============================================================================
# Route Tables & Associations
# ==============================================================================

# 1. Public Route Table (direct internet egress via IGW)
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-public-rt"
    Environment = var.environment
  })
}

resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# 2. Private App Route Table(s) (outbound internet via NAT Gateway)
resource "aws_route_table" "private_app" {
  count  = var.enable_multi_az_nat ? length(var.availability_zones) : 1
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id
  }

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-private-app-rt-${count.index + 1}"
    Environment = var.environment
  })
}

resource "aws_route_table_association" "private_app" {
  count          = length(var.private_app_subnet_cidrs)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = var.enable_multi_az_nat ? aws_route_table.private_app[count.index].id : aws_route_table.private_app[0].id
}

# 3. Private Data Route Table (Isolated: no default route to 0.0.0.0/0)
resource "aws_route_table" "private_data" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-private-data-rt"
    Environment = var.environment
  })
}

resource "aws_route_table_association" "private_data" {
  count          = length(var.private_data_subnet_cidrs)
  subnet_id      = aws_subnet.private_data[count.index].id
  route_table_id = aws_route_table.private_data.id
}

# ==============================================================================
# S3 Gateway Endpoint (Bypasses NAT Gateway for zero data transfer cost)
# ==============================================================================

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.us-east-1.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = concat(
    [aws_route_table.public.id, aws_route_table.private_data.id],
    aws_route_table.private_app[*].id
  )

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-s3-endpoint"
    Environment = var.environment
  })
}

# ==============================================================================
# DB & Cache Subnet Groups (Ready for Phase 3 & 4)
# ==============================================================================

resource "aws_db_subnet_group" "rds" {
  name        = "${var.project_name}-${var.environment}-db-subnet-group"
  description = "Database subnet group for Amazon RDS PostgreSQL"
  subnet_ids  = aws_subnet.private_data[*].id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-db-subnet-group"
    Environment = var.environment
  })
}

resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-subnet-group"
  description = "Cache subnet group for ElastiCache Redis / Valkey"
  subnet_ids  = aws_subnet.private_data[*].id

  tags = merge(var.tags, {
    Name        = "${var.project_name}-${var.environment}-redis-subnet-group"
    Environment = var.environment
  })
}
