# Database Setup Instructions

To connect our Node.js/Prisma backend to an AWS-hosted PostgreSQL database, we will use **Amazon RDS (Relational Database Service)**. This provides a managed, scalable, and highly available PostgreSQL instance.

## Step 1: Provisioning the AWS RDS PostgreSQL Instance

Since we cannot directly run AWS Console commands without your credentials, here is the exact manual process you should follow in your AWS account:

1. Log into your **AWS Management Console**.
2. Navigate to **RDS (Relational Database Service)**.
3. Click **Create database**.
4. Choose **Standard create**.
5. Engine options: Select **PostgreSQL**.
6. Version: Choose **PostgreSQL 16.x** (or highest available stable version).
7. Templates: Select **Free tier** (if you want to avoid initial costs) or **Dev/Test**.
8. Settings:
   - **DB instance identifier**: `floework-db`
   - **Master username**: `postgres`
   - **Master password**: *Create a strong password and save it.*
9. Connectivity:
   - **Public access**: Select **Yes** (Only do this for development so your local machine can connect to it. For production, it should be No and accessed via an EC2 bastion or peered VPC).
   - **VPC security group**: Create a new one. Ensure you add an inbound rule allowing TCP port `5432` from your local IP address (or `0.0.0.0/0` temporarily, though not recommended for security).
10. Click **Create database**.

It will take a few minutes for the database to provision.

## Step 2: Getting the Connection String

Once the database state is "Available", click on the instance name to view its **Endpoint**.

Your connection string (DATABASE_URL) will look like this:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/floework?schema=public"
```

## Step 3: Local Configuration

1. Create a `.env` file in the `backend/` directory.
2. Add your AWS RDS connection string to it.

```env
# backend/.env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@floework-db.xxxxx.region.rds.amazonaws.com:5432/floework?schema=public"
PORT=5000
FRONTEND_URL="http://localhost:5173"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

## Step 4: Pushing the Schema

Once your `.env` is configured with the live AWS credentials, you will run:
```bash
npx prisma db push
```
This will automatically generate the tables in your AWS database based on our `schema.prisma` file!
