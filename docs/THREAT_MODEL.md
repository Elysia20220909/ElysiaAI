# 孱・・ElysiaAI: Threat Model & Security Boundaries

This document provides a technical translation of ElysiaAI's "ICE Protocol" into industry-standard security terminology. It defines the threat landscape, trust boundaries, and mitigation strategies.

## 1. Security Boundaries (Trust Zones)

| Zone | Component | Trust Level | Security Controls |
| :--- | :--- | :--- | :--- |
| **Zone 0 (External)** | World Wide Web / Public API | Untrusted | Firewall, Rate Limiting, CORS |
| **Zone 1 (Gateway)** | Bun / ElysiaJS Backend | Semi-Trusted | JWT Verification, Input Validation, Helmet |
| **Zone 2 (Core)** | Python Intelligence Kernel | Trusted | Internal API Proxying, Sanitization |
| **Zone 3 (Deep State)** | Milvus / Local Filesystem | High Trust | AES-256-GCM Encryption, Scrypt KDF |

## 2. Threat Analysis (STRIDE)

### Spoofing (縺ｪ繧翫☆縺ｾ縺・
- **Threat**: Attackers attempting to impersonate valid users or administrators.
- **Mitigation**: **JWT Singularity** (Zone 1). Dual-token (Access/Refresh) system with 15-minute expiration for access tokens. Mandatory `admin` role check for sensitive endpoints.

### Tampering (謾ｹ縺悶ｓ)
- **Threat**: Unauthorized modification of long-term memory (Engrams) or configuration.
- **Mitigation**: **Memory Encryption** (AES-256-GCM). Every chunk in Milvus is encrypted with an authenticated tag, ensuring tampering is detected upon retrieval.

### Repudiation (蜷ｦ隱・
- **Threat**: Users or agents denying actions they performed.
- **Mitigation**: **AEGIS Ledger**. Every significant action is logged with a unique hash in the `ActionLog` table.

### Information Disclosure (諠・�ｱ貍乗ｴｩ)
- **Threat**: Sensitive user data or API keys leaking through logs or error messages.
- **Mitigation**: **Log Redaction**. Automatic masking of OpenAI/Groq keys in all log streams. Full stack trace suppression in production mode.

### Denial of Service (繧ｵ繝ｼ繝薙せ諡貞凄)
- **Threat**: Overloading the local LLM or API to crash the sovereign instance.
- **Mitigation**: **Adaptive Rate Limiting**. Multi-algorithm rate limiting (Sliding Window) applied at the Gateway (Zone 1).

### Elevation of Privilege (讓ｩ髯先・譬ｼ)
- **Threat**: Regular users accessing /admin or /system routes.
- **Mitigation**: **RBAC Guard**. Strict role-based access control enforced at the routing layer before any logic is executed.

## 3. The ICE Mapping (Conceptual to Technical)

| Concept | Technical Implementation | Goal |
| :--- | :--- | :--- |
| **White ICE** | Ingress Protection (Rate Limit, Helmet, CORS) | Traffic hygiene and basic validation. |
| **Black ICE** | Egress/Intelligence Protection (Prompt Injection Detection, IP Blacklisting) | Active threat mitigation and jailbreak prevention. |
| **AbyssRTOS** | Process Isolation (Containerization / Local execution) | Complete computational sovereignty. |

---
ﾂｩ 2026 Elysia20220909 // ElysiaAI Security
