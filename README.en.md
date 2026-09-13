# ElysiaAI // INFINITE RESONANCE

ElysiaAI is a long-term project to build an independent AI-native operating system,
starting with its kernel. The goal is to make memory, tools, and permissions part
of the OS design, with people able to understand and control what runs.

[日本語 / Main README](README.md) · [Code of conduct](.github/CODE_OF_CONDUCT.md) ·
[Contributing](CONTRIBUTING.md) · [License](LICENSE) · [Security](SECURITY.md)

## Current status

The development tree contains two distinct tracks:

| Track | Implemented scope | Limits |
| --- | --- | --- |
| Independent OS, M1 / M2a / M2b / M2c / M3a / M3b / M3c / M3d / M3e / M3f | UEFI entry into an x86-64 Rust kernel; physical page allocation and release; independent page tables; two Ring 3 processes with log/yield/exit syscalls and cooperative switching; fault containment, PIT preemption, cumulative tick limits and owned-frame reclamation, bounded IPC, per-process capability checks, blocking receive, cancellation and permission-checked synthetic RAM document reads and bounded service restart and static user ELF loading in QEMU | No capability delegation, general endpoints, precise CPU-time accounting, general spawn API, guest AI inference, or verified hardware support |
| Existing host application | Bun / Elysia.js, Python / FastAPI, and Tauri code for developing AI interactions on an existing OS | Has not been ported to the independent kernel |

The host application's “AI Kernel” means its Python service, not the independent
kernel in `native-os/`. M2b contains synchronous user faults by stopping the faulty
process and continuing another. Kernel faults remain terminal. This is a bounded
two-process fixture, not a general-purpose application runtime.

M2c also tests non-yielding and yielding CPU hogs, and 64 generations of exit/fault/reclamation.
The target is x86-64 UEFI PCs commonly running Windows, initially tested in QEMU on Windows.

M3b adds a read-only synthetic RAM document service. The kernel binds authority checks to the
actual IPC sender; a Ring 3 service replies. No host documents are loaded. M3c preserves the client while restarting the service,
issues new connection handles, and tests eight restarts and allocation rollback.

M3d loads a separately built static user ELF from a RAM bundle after validating its layout.
The 2026-09-13 validation records report 45 passing boot, fault, lifecycle, IPC, document, recovery and ELF scenarios on
the specified Windows, Rust, QEMU, and UEFI combination. See
[M1 boot validation](docs/native-os/BOOT_VALIDATION.md) and
[M2a memory validation](docs/native-os/MEMORY_VALIDATION.md), and
[M2b userspace validation](docs/native-os/USERSPACE_VALIDATION.md), and
[M2c lifecycle validation](docs/native-os/LIFECYCLE_VALIDATION.md), and
[M3a IPC validation](docs/native-os/IPC_VALIDATION.md), and
[M3b document validation](docs/native-os/DOCUMENT_SERVICE_VALIDATION.md), and
[M3c service recovery](docs/native-os/SERVICE_RECOVERY_VALIDATION.md), and
[M3d user ELF validation](docs/native-os/USER_ELF_VALIDATION.md) for evidence and limits.
Full setup on a new machine and everyday OS stability have not been demonstrated.

M3e moves the recovery document service into a dedicated ELF, loaded on initial start and every restart; see [service ELF validation](docs/native-os/SERVICE_ELF_VALIDATION.md).

M3f also builds the recovery client as an ELF and passes only role-specific startup handles. Document grants are issued only to the client; see [client ELF validation](docs/native-os/CLIENT_ELF_VALIDATION.md).

This overview describes the development lineage containing M3f. Design, M1, and M2a
are stacked in [PR #109](https://github.com/Elysia20220909/ElysiaAI/pull/109),
[PR #110](https://github.com/Elysia20220909/ElysiaAI/pull/110), and
[PR #111](https://github.com/Elysia20220909/ElysiaAI/pull/111).
M2b follows the repository guide in [PR #112](https://github.com/Elysia20220909/ElysiaAI/pull/112).
M2c builds on M2b in [PR #113](https://github.com/Elysia20220909/ElysiaAI/pull/113).
M3a builds on M2c in [PR #114](https://github.com/Elysia20220909/ElysiaAI/pull/114).
M3b builds on M3a in [PR #115](https://github.com/Elysia20220909/ElysiaAI/pull/115).
M3c builds on the development branch after merging [PR #116](https://github.com/Elysia20220909/ElysiaAI/pull/116).
M3d builds on [PR #117](https://github.com/Elysia20220909/ElysiaAI/pull/117).
Check the PRs for their adoption into the default branch.

## Start developing

For the independent OS, read the [design overview](docs/native-os/README.md),
[milestones](docs/native-os/MILESTONES.md), and [dependency notes](native-os/DEPENDENCIES.md).
Check out a branch containing `native-os/`, review the source and setup scripts,
then follow the pinned environment and [build and test instructions](native-os/README.md).
The Rust workspace is independent of the host app; Python drives the headless QEMU tests.

For the existing host app, read the [Beta 0.1 tester guide](docs/BETA_0_1_TESTER_GUIDE.md)
and [contribution guide](CONTRIBUTING.md). After reviewing dependencies and preparing
Bun and Python, the management commands are:

```powershell
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
bun scripts/manage.ts dev
```

These commands install dependencies, prepare Prisma and a Python virtual environment,
and start the host app. The first command creates `.env` only if it is absent.
Review existing configuration and uncommitted work before running setup.
These steps do not boot the independent OS.

Local processing is a design priority. External APIs, model downloads, integrations,
and data retention depend on configuration and the features used. This is not a
guarantee that data never leaves the machine. See the [security policy](SECURITY.md).

## Participate

Contributions can improve code, documentation, tests, and design reviews. Follow
[CONTRIBUTING.md](CONTRIBUTING.md) and the [code of conduct](.github/CODE_OF_CONDUCT.md).
Repository access is controlled by its owner; a license does not grant GitHub access.
Use [SECURITY.md](SECURITY.md) for vulnerabilities rather than posting sensitive details
in ordinary issues. The detailed development documentation is currently in Japanese.

ElysiaAI is dual-licensed under **MIT OR Apache-2.0**, at your option. See
[LICENSE](LICENSE), [LICENSE-MIT](LICENSE-MIT), and [LICENSE-APACHE](LICENSE-APACHE).
Third-party dependencies and assets retain their own license terms.
