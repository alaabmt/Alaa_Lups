#!/usr/bin/env python3
"""Safe, offline consistency checks for NA7N's AWS UAE readiness files.

This is NOT an AWS CloudFormation validation, security audit, or deployment.
Run: python3 infrastructure/aws-uae/readiness_check.py
"""
from pathlib import Path
import re
import sys

folder = Path(__file__).resolve().parent
template = (folder / "cloudformation" / "na7n-data-foundation.yaml").read_text(encoding="utf-8")
readme = (folder / "README.md").read_text(encoding="utf-8")
inventory = (folder / "migration-inventory.md").read_text(encoding="utf-8")
runbook = (folder / "cutover-checklist.md").read_text(encoding="utf-8")

checks = {
    "no deploy is default": bool(re.search(r"DeployInfrastructure:\s*\n\s*Type: String\s*\n\s*Default: 'NO'", template)),
    "approval + UAE region conditions": all(x in template for x in [
        "DeploymentApproved", "InUAE", "CreateUAEInfrastructure", "me-central-1"
    ]),
    "every resource gated": (
        len(re.findall(r"^    Type: AWS::", template, re.M)) ==
        len(re.findall(r"^    Condition: CreateUAEInfrastructure$", template, re.M))
    ),
    "database private and encrypted": all(x in template for x in [
        "PubliclyAccessible: false", "StorageEncrypted: true",
        "ManageMasterUserPassword: true", "DeletionProtection: true",
        "DeletionPolicy: Snapshot"
    ]),
    "no public S3 access": all(x in template for x in [
        "BlockPublicAcls: true", "IgnorePublicAcls: true",
        "BlockPublicPolicy: true", "RestrictPublicBuckets: true",
        "DenyInsecureTransport"
    ]),
    "migration gate and rollback documented": all(x in runbook for x in [
        "المرحلة صفر", "المرحلة الرابعة", "إجراء التراجع", "Go/No-Go"
    ]),
    "identity and data inventory documented": all(x in inventory for x in [
        "na7n_profiles", "na7n_assessments", "na7n_qslaq_demo_results",
        "Supabase Auth", "MFA"
    ]),
    "regional outage caution": "AWS Health" in readme and "me-central-1" in readme,
    "no apparent embedded cloud secret": not bool(re.search(
        r"AKIA[0-9A-Z]{16}|-----BEGIN PRIVATE KEY-----|aws_secret_access_key\s*=",
        template + readme + inventory + runbook)),
}

for name, passed in checks.items():
    print(("PASS" if passed else "FAIL") + " | " + name)
print("Static checks only. No AWS access, no infrastructure creation, no production readiness certification.")
if not all(checks.values()):
    sys.exit(1)
