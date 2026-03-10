# Avalanche Node EC2 Deployment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Avalanche RPC node EC2 instance to the existing Elysium VPC via Terraform, accessible from all VPC resources on port 9650.

**Architecture:** New EC2 (`t3.large`) in private subnet with fixed IP `10.0.1.50`, security group allowing VPC-wide RPC access on 9650, outbound internet via existing NAT Gateway for P2P sync. Docker installed via user_data; node setup is manual via SSM.

**Tech Stack:** Terraform, AWS EC2, Docker, AvalancheGo

**Design doc:** `docs/plans/2026-02-16-avalanche-node-deployment-design.md`

---

### Task 1: Add Avalanche variables to `variables.tf`

**Files:**
- Modify: `infra/terraform/variables.tf`

**Step 1: Add two new variables at end of file**

Append after the existing `db_name` variable (line 5):

```hcl
variable "avalanche_instance_type" {
  type    = string
  default = "t3.large"
}

variable "avalanche_volume_size" {
  type    = number
  default = 100
}
```

**Step 2: Commit**

```bash
git add infra/terraform/variables.tf
git commit -m "infra: add avalanche instance type and volume size variables"
```

---

### Task 2: Add Avalanche security group and EC2 to `main.tf`

**Files:**
- Modify: `infra/terraform/main.tf` (append after line 239, after the `aws_secretsmanager_secret_version.db` resource)

**Step 1: Add the security group**

Append to end of `main.tf`:

```hcl
# --- Avalanche Node ---

resource "aws_security_group" "avalanche" {
  name        = "${local.name}-avalanche-sg"
  description = "Avalanche RPC node"
  vpc_id      = aws_vpc.main.id

  # RPC API accessible from anywhere in VPC
  ingress {
    from_port   = 9650
    to_port     = 9650
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Management access from bastion
  ingress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.bastion.id]
  }

  # Outbound: internet via NAT for P2P peering
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-avalanche-sg" }
}
```

**Step 2: Add the EC2 instance**

Append directly after the security group:

```hcl
resource "aws_instance" "avalanche" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.avalanche_instance_type
  key_name               = "rf-ely-1"
  subnet_id              = aws_subnet.private_a.id
  private_ip             = "10.0.1.50"
  vpc_security_group_ids = [aws_security_group.avalanche.id]
  iam_instance_profile   = aws_iam_instance_profile.bastion.name

  root_block_device {
    volume_size = var.avalanche_volume_size
    volume_type = "gp3"
    throughput  = 250
    iops        = 3000
  }

  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail
    dnf update -y
    dnf install -y docker git
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ec2-user
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
  EOF

  tags = { Name = "${local.name}-avalanche-node" }
}
```

**Step 3: Commit**

```bash
git add infra/terraform/main.tf
git commit -m "infra: add avalanche node EC2 and security group"
```

---

### Task 3: Add Avalanche outputs to `outputs.tf`

**Files:**
- Modify: `infra/terraform/outputs.tf` (append after line 23)

**Step 1: Add two new outputs at end of file**

```hcl
output "avalanche_instance_id" {
  value = aws_instance.avalanche.id
}

output "avalanche_private_ip" {
  value = aws_instance.avalanche.private_ip
}
```

**Step 2: Commit**

```bash
git add infra/terraform/outputs.tf
git commit -m "infra: add avalanche instance id and private ip outputs"
```

---

### Task 4: Update `deploy-dev.yml` to read Avalanche outputs

**Files:**
- Modify: `.github/workflows/deploy-dev.yml:97-105` (the "Read Terraform outputs" step)

**Step 1: Add two lines to the outputs step**

After line 105 (`echo "subnet_id_2=..."`), add:

```yaml
          echo "avalanche_instance_id=$(echo $OUT | jq -r .avalanche_instance_id.value)" >> $GITHUB_OUTPUT
          echo "avalanche_private_ip=$(echo $OUT | jq -r .avalanche_private_ip.value)" >> $GITHUB_OUTPUT
```

**Step 2: Commit**

```bash
git add .github/workflows/deploy-dev.yml
git commit -m "ci: read avalanche outputs in dev deployment workflow"
```

---

### Task 5: Fix `deploy-prod.yml` — add missing `bastion_ami_id` and Avalanche outputs

**Files:**
- Modify: `.github/workflows/deploy-prod.yml:83-91` (the "Terraform Apply (prod)" step)
- Modify: `.github/workflows/deploy-prod.yml:92-100` (the "Read Terraform outputs" step)

**Step 1: Add `TF_VAR_bastion_ami_id` to Terraform Apply (prod) env block**

In the "Terraform Apply (prod)" step env section (line 85-90), add after `TF_VAR_db_name`:

```yaml
          TF_VAR_bastion_ami_id: ${{ vars.BASTION_AMI_ID }}
```

**Step 2: Add Avalanche outputs to "Read Terraform outputs" step**

After line 100 (`echo "subnet_id_2=..."`), add:

```yaml
          echo "avalanche_instance_id=$(echo $OUT | jq -r .avalanche_instance_id.value)" >> $GITHUB_OUTPUT
          echo "avalanche_private_ip=$(echo $OUT | jq -r .avalanche_private_ip.value)" >> $GITHUB_OUTPUT
```

**Step 3: Commit**

```bash
git add .github/workflows/deploy-prod.yml
git commit -m "ci: fix prod workflow missing bastion_ami_id, add avalanche outputs"
```

---

### Task 6: Validate Terraform locally

**Step 1: Run terraform validate**

```bash
cd infra/terraform
terraform validate
```

Expected: `Success! The configuration is valid.`

**Step 2: Commit any fixes if needed**

---

### Task 7: Final review and push

**Step 1: Review all changes**

```bash
git log --oneline deployAvalancheInstance --not dev
git diff dev...HEAD --stat
```

**Step 2: Push branch**

```bash
git push origin deployAvalancheInstance
```

**Step 3: Merge to `dev` to trigger deployment**

Create PR or merge directly. GitHub Actions will run `terraform apply` which creates the EC2.

**Step 4: After deployment — get instance ID from workflow logs or CLI**

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*avalanche*" \
  --query 'Reservations[].Instances[].[InstanceId,PrivateIpAddress,State.Name]' \
  --output table --profile elysium
```

**Step 5: SSM into the instance**

```bash
aws ssm start-session --target i-INSTANCE_ID --profile elysium
```

---

### Post-Deployment (manual, on the instance via SSM)

1. Verify Docker is running: `docker --version && docker compose version`
2. Clone or copy `avalanche_node` setup files
3. Create `.env` with `SUBNET_ID`, `BLOCKCHAIN_ID`, `VM_ID`
4. Run `./setup.sh`
5. Get NodeID from logs: `docker compose logs 2>&1 | grep "NodeID"`
6. Send NodeID to AvaCloud support for allowedNodes whitelist
7. Update `docker-compose.yml` to add `--allowed-nodes=...` and `--validator-only`
8. Restart: `docker compose down && docker compose up -d`
9. Verify sync: `curl -s http://localhost:9650/ext/health | jq .`
10. Test RPC from bastion: `curl -s http://10.0.1.50:9650/ext/health` (from bastion via SSM)
