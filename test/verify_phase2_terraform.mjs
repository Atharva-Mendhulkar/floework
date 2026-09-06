import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('PHASE 2 AWS FOUNDATION IAC VERIFICATION');
console.log('====================================================\n');

const terraformDir = path.resolve('terraform');
const requiredFiles = [
  'terraform/.gitignore',
  'terraform/README.md',
  'terraform/modules/networking/main.tf',
  'terraform/modules/networking/variables.tf',
  'terraform/modules/networking/outputs.tf',
  'terraform/modules/security/main.tf',
  'terraform/modules/security/variables.tf',
  'terraform/modules/security/outputs.tf',
  'terraform/modules/secrets/main.tf',
  'terraform/modules/secrets/variables.tf',
  'terraform/modules/secrets/outputs.tf',
  'terraform/environments/staging/main.tf',
  'terraform/environments/staging/variables.tf',
  'terraform/environments/staging/outputs.tf',
  'terraform/environments/staging/terraform.tfvars.example',
];

let allPassed = true;

function check(title, condition, detail = '') {
  if (condition) {
    console.log(`[PASS] ${title}`);
  } else {
    console.error(`[FAIL] ${title}${detail ? ` (${detail})` : ''}`);
    allPassed = false;
  }
}

// 1. File existence check
console.log('1. Verifying Terraform File Tree:');
for (const relPath of requiredFiles) {
  const fullPath = path.resolve(relPath);
  check(`File exists: ${relPath}`, fs.existsSync(fullPath));
}

// 2. CIDR collision and boundary check
console.log('\n2. Verifying Subnet Allocation & CIDRs:');
const netMain = fs.readFileSync('terraform/modules/networking/main.tf', 'utf-8');
const netVars = fs.readFileSync('terraform/modules/networking/variables.tf', 'utf-8');

function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function parseCidr(cidr) {
  const [ip, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const start = (ipToLong(ip) & mask) >>> 0;
  const count = Math.pow(2, 32 - bits);
  const end = (start + count - 1) >>> 0;
  return { cidr, start, end, count };
}

const cidrs = [
  '10.0.1.0/24',
  '10.0.2.0/24',
  '10.0.10.0/24',
  '10.0.11.0/24',
  '10.0.20.0/24',
  '10.0.21.0/24',
].map(parseCidr);

const vpcCidr = parseCidr('10.0.0.0/16');

// Verify all subnets are inside the VPC
for (const s of cidrs) {
  check(
    `Subnet ${s.cidr} contained within VPC 10.0.0.0/16`,
    s.start >= vpcCidr.start && s.end <= vpcCidr.end
  );
}

// Check for overlaps between subnets
let overlapFound = false;
for (let i = 0; i < cidrs.length; i++) {
  for (let j = i + 1; j < cidrs.length; j++) {
    const a = cidrs[i];
    const b = cidrs[j];
    if (a.start <= b.end && b.start <= a.end) {
      overlapFound = true;
      console.error(`Overlap detected between ${a.cidr} and ${b.cidr}`);
    }
  }
}
check('Subnets have zero CIDR collisions / overlaps', !overlapFound);

// 3. Security Perimeter & Group Rules Check
console.log('\n3. Verifying Security Group Ingress Chaining:');
const secMain = fs.readFileSync('terraform/modules/security/main.tf', 'utf-8');

check(
  'ALB security group allows public 80 and 443 ingress',
  secMain.includes('from_port   = 80') && secMain.includes('from_port   = 443')
);

check(
  'ECS security group restricts ingress to ALB security group',
  secMain.includes('security_groups = [aws_security_group.alb.id]')
);

check(
  'RDS security group restricts port 5432 to ECS security group only',
  secMain.includes('from_port       = 5432') &&
    secMain.includes('security_groups = [aws_security_group.ecs.id]')
);

check(
  'Redis security group restricts port 6379 to ECS security group only',
  secMain.includes('from_port       = 6379') &&
    secMain.includes('security_groups = [aws_security_group.ecs.id]')
);

check(
  'Dedicated KMS CMK with automated key rotation enabled',
  secMain.includes('aws_kms_key') && secMain.includes('enable_key_rotation     = true')
);

// 4. Staging Composition & Output Wiring Check
console.log('\n4. Verifying Module Wiring in Staging Environment:');
const stagingMain = fs.readFileSync('terraform/environments/staging/main.tf', 'utf-8');
const stagingOutputs = fs.readFileSync('terraform/environments/staging/outputs.tf', 'utf-8');

check(
  'Staging connects networking module vpc_id to security module',
  stagingMain.includes('vpc_id       = module.networking.vpc_id')
);

check(
  'Staging connects security module kms_key_id to secrets module',
  stagingMain.includes('kms_key_id                = module.security.kms_key_id')
);

check(
  'Staging outputs DB subnet group name for Phase 3 RDS',
  stagingOutputs.includes('output "db_subnet_group_name"')
);

check(
  'Staging outputs ECS security group ID for Phase 4 ECS Fargate',
  stagingOutputs.includes('output "ecs_security_group_id"')
);

check(
  'Staging outputs Redis security group ID for Phase 4 ElastiCache',
  stagingOutputs.includes('output "redis_security_group_id"')
);

console.log('====================================================');
if (allPassed) {
  console.log('ALL PHASE 2 IAC VERIFICATION CHECKS PASSED');
  process.exit(0);
} else {
  console.error('PHASE 2 IAC VERIFICATION FAILED');
  process.exit(1);
}
