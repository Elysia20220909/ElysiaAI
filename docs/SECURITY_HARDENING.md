# Security Hardening Guide

## Overview

This guide documents the security enhancements implemented to protect sensitive files and configurations in the Elysia AI project.

## Protected Directory Structure

```
.internal/
├── security/              # Security modules (Access Level: SUPER_ADMIN)
│   ├── config-manager.ts  # Security configuration loader
│   ├── encryption.ts      # Encryption utilities
│   ├── access-control.ts  # Access control manager
│   └── README.md          # Security documentation
├── secrets/               # Sensitive credentials (Access Level: SYSTEM)
│   └── .env.secrets       # Secret keys and tokens
└── private/               # Private configurations (Access Level: ADMIN)
    └── README.md          # Private config documentation
```

## Security Layers

### Layer 1: File System Protection

**Unix/Linux**:
```bash
# Set restrictive permissions
chmod 700 .internal/
chmod 700 .internal/security/
chmod 700 .internal/secrets/
chmod 700 .internal/private/
chmod 600 .internal/secrets/.env.secrets
```

**Windows PowerShell**:
```powershell
# Remove inheritance
icacls ".internal" /inheritance:r

# Grant only SYSTEM and Administrators
icacls ".internal" /grant:r "SYSTEM:(OI)(CI)F"
icacls ".internal" /grant:r "Administrators:(OI)(CI)F"

# Restrict secrets directory
icacls ".internal\secrets" /inheritance:r
icacls ".internal\secrets" /grant:r "SYSTEM:(OI)(CI)F"
```

### Layer 2: Version Control Protection

All sensitive directories are in `.gitignore`:
- `.internal/`
- `.internal/secrets/`
- `.internal/security/`
- `.internal/private/`
- Any `**/secrets/` directories
- Any `.env.secrets` files

### Layer 3: Docker Image Protection

`.dockerignore` excludes:
- `.internal/` directory
- All sensitive file patterns
- Private keys and certificates

### Layer 4: Application-Level Access Control

**Access Levels**:
```typescript
enum AccessLevel {
  PUBLIC = 0,        // Public resources
  AUTHENTICATED = 1, // Logged-in users
  ADMIN = 2,        // Administrators
  SUPER_ADMIN = 3,  // Super administrators
  SYSTEM = 4        // System-level only
}
```

**Protected Resources**:
- `.internal/secrets/*` → SYSTEM level
- `.internal/security/*` → SUPER_ADMIN level
- `.internal/private/*` → ADMIN level
- `.env` → SYSTEM level
- `data/*.jsonl` → ADMIN level
- `logs/*` → ADMIN level
- `backups/*` → ADMIN level

### Layer 5: Encryption at Rest

All sensitive data is encrypted using:
- **Algorithm**: AES-256-GCM
- **Key Derivation**: scrypt
- **Authentication**: GCM auth tags
- **IV**: Unique per encryption

## Setup Instructions

### 1. Initial Setup

```powershell
# Clone repository
git clone https://github.com/chloeamethyst/ElysiaJS.git
cd ElysiaJS

# Create protected directories (already done)
# .internal/security, .internal/secrets, .internal/private exist

# Generate strong secrets
$jwtSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$sessionSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$encryptionKey = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

Write-Host "JWT_SECRET=$jwtSecret"
Write-Host "SESSION_SECRET=$sessionSecret"
Write-Host "ENCRYPTION_KEY=$encryptionKey"
```

### 2. Configure Secrets

Edit `.internal/secrets/.env.secrets`:
```bash
# Replace all default values with strong random values
JWT_SECRET=<generated-value>
JWT_REFRESH_SECRET=<generated-value>
SESSION_SECRET=<generated-value>
ENCRYPTION_KEY=<generated-value>
```

### 3. Set File Permissions

**Windows**:
```powershell
.\scripts\setup-security.ps1
```

**Unix/Linux**:
```bash
chmod +x scripts/setup-security.sh
./scripts/setup-security.sh
```

### 4. Verify Setup

```powershell
# Run security verification
bun run test:security

# Check access control
bun run verify:access
```

## Usage Examples

### Protecting Sensitive Operations

```typescript
import { accessControl, AccessLevel } from './.internal/security/access-control';

app.post('/admin/sensitive', async (ctx) => {
  const user = ctx.user; // From JWT middleware
  const ip = ctx.request.ip;
  
  // Check access
  const access = accessControl.checkAccess(
    user.id,
    user.accessLevel,
    '.internal/secrets/.env.secrets',
    ip
  );
  
  if (!access.allowed) {
    return ctx.error(403, access.reason);
  }
  
  // Proceed with sensitive operation
  // ...
});
```

### Encrypting Sensitive Data

```typescript
import { encryption } from './.internal/security/encryption';

// Encrypt before storing
const userData = { email: 'user@example.com', ssn: '123-45-6789' };
const encrypted = encryption.encrypt(JSON.stringify(userData));
await db.save(encrypted);

// Decrypt when retrieving
const encrypted = await db.load();
const userData = JSON.parse(encryption.decrypt(encrypted));
```

### Secure Configuration Loading

```typescript
import SecurityConfigManager from './.internal/security/config-manager';

// Load security configuration
const config = SecurityConfigManager.loadConfig();

// Use in JWT middleware
const jwtSecret = SecurityConfigManager.getJWTSecret();
```

## Monitoring and Auditing

### Access Logs

```typescript
import { accessControl } from './.internal/security/access-control';

// Get recent access attempts
const logs = accessControl.getAccessLog(100);

// Export for analysis
const fullLog = accessControl.exportAccessLog();
await saveToFile('audit-log.json', fullLog);
```

### Alerts

Set up monitoring for:
1. **Failed Access Attempts**: >3 failures in 5 minutes
2. **Unauthorized Access**: Attempts to access SYSTEM resources
3. **After-Hours Access**: Access outside business hours
4. **Unknown IPs**: Access from non-whitelisted IPs
5. **Decryption Failures**: Multiple failed decryption attempts

### Prometheus Metrics

```typescript
// Add to monitoring
const accessDeniedCounter = new Counter({
  name: 'access_denied_total',
  help: 'Total number of denied access attempts',
  labelNames: ['resource', 'user', 'reason']
});
```

## Incident Response

### If Secrets Are Compromised

1. **Immediate**:
   - Generate new secrets
   - Update `.internal/secrets/.env.secrets`
   - Revoke all active tokens
   - Restart all services

2. **Investigation**:
   - Review access logs
   - Identify breach source
   - Determine scope of compromise

3. **Remediation**:
   - Rotate all affected credentials
   - Update security policies
   - Patch vulnerabilities

4. **Communication**:
   - Notify security team
   - Document incident
   - Update procedures

### Emergency Procedures

```powershell
# Emergency secret rotation
.\scripts\emergency-rotate-secrets.ps1

# Review security logs
.\scripts\security-audit.ps1

# Verify system integrity
.\scripts\integrity-check.ps1
```

## Compliance

This security setup helps meet:

- **GDPR**: Encryption, access control, audit logs
- **PCI DSS**: Key management, access logging, encryption
- **HIPAA**: Data encryption, access control, audit trail
- **SOC 2**: Security controls, monitoring, incident response
- **ISO 27001**: Information security management

## Best Practices

### DO:
✅ Use strong random secrets (min 32 bytes)
✅ Rotate secrets every 90 days
✅ Review access logs weekly
✅ Encrypt sensitive data at rest
✅ Use TLS for all network communication
✅ Implement principle of least privilege
✅ Regular security audits

### DON'T:
❌ Commit secrets to version control
❌ Use default/example values in production
❌ Share secrets via insecure channels
❌ Hardcode credentials in source code
❌ Reuse secrets across environments
❌ Grant unnecessary permissions
❌ Ignore security warnings

## Testing

```bash
# Run security tests
bun test tests/security.test.ts

# Static analysis
bun run lint:security

# Dependency audit
bun audit

# Penetration testing
npm run test:pentest
```

## Maintenance

### Monthly Tasks:
- Review access logs
- Check for unauthorized access attempts
- Verify encryption keys are secure
- Update security documentation

### Quarterly Tasks:
- Rotate all secrets
- Security audit
- Update dependencies
- Review and update access policies

### Yearly Tasks:
- Full security assessment
- Penetration testing
- Disaster recovery drill
- Update incident response procedures

## Support

For security issues:
- **Email**: security@your-domain.com
- **Emergency**: Use incident response procedures
- **Documentation**: `.internal/security/README.md`

---

**Classification**: CONFIDENTIAL
**Last Updated**: 2025-12-03
**Next Review**: 2025-01-03
