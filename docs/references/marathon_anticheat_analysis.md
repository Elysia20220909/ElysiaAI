# 🛡️ Case Study: Marathon Anti-Cheat Architecture (2026-04)

Bungie's security strategy for *Marathon* (Extraction Shooter) represents a multi-layered, "Zero-Tolerance" approach designed to protect the high-stakes "lose everything on death" gameplay.

## 📊 Core Principles
The system operates on a **Zero-Tolerance** policy: any confirmed cheating results in an immediate and permanent BAN.

### 1. Multi-Layered Defense ( BattlEye & Kernel-Level)
- **BattlEye Integration**: Industry-standard kernel-level anti-cheat that operates at the OS core.
- **Hardware BAN**: Utilizes **Secure Boot** and hardware identifiers (Motherboard level) to prevent account re-registration on the same machine.

### 2. Server-Side Authority
- **Dedicated Server Validation**: Critical actions (firing, looting, movement) are processed server-side. Clients cannot unilaterally rewrite game state.
- **Fog of War (ハック無効化)**: A technical ceiling where the server limits data transmission to the client. If an enemy is behind a wall, the client simply doesn't receive their position data, rendering Wallhacks/ESP physically ineffective.

---

## 🛰️ 2026-04 Update Highlights
Recent enhancements focusing on community feedback and emerging threats:

| Feature | Description |
| :--- | :--- |
| **Telemetry Expansion** | Background data analysis to identify suspicious behavioral patterns automatically. |
| **Stream Snipe Guard** | Privacy settings to hide names and prevent "Ghosting" in competitive matches. |
| **Rapid Feedback** | Re-designed reporting tools that notify users when a reported player is penalized. |

## ⚠️ Platform Warnings
- **Linux/Steam Deck**: Currently **unsupported** due to the strictness of the kernel-level detection combined with BattlEye. Attempts to play on these platforms may be flagged as suspicious behavior.

---
> [!NOTE]
> This analysis serves as a strategic reference for the **ElysiaAI Aegis Sentinel** protocol.

*Source: Internal Reconnaissance (2026-04 cycle)*
