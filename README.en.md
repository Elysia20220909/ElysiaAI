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
| Independent OS, M1 / M2a | UEFI entry into an x86-64 Rust kernel; physical page allocation and release; independent page tables; fault diagnostics in QEMU | No user space, syscalls, execution switching, process isolation, guest AI inference, or verified hardware support |
| Existing host application | Bun / Elysia.js, Python / FastAPI, and Tauri code for developing AI interactions on an existing OS | Has not been ported to the independent kernel |

The host application's “AI Kernel” means its Python service, not the independent
kernel in `native-os/`. M2a is only the first part of the memory-management milestone.
Protection faults currently stop the kernel after diagnosis; it cannot terminate
one faulty process and continue running others.

The 2026-09-12 validation records report seven passing boot and fault scenarios on
the specified Windows, Rust, QEMU, and UEFI combination. See
[M1 boot validation](docs/native-os/BOOT_VALIDATION.md) and
[M2a memory validation](docs/native-os/MEMORY_VALIDATION.md) for evidence and limits.
Full setup on a new machine and everyday OS stability have not been demonstrated.

This overview describes the development lineage containing M2a. Design, M1, and M2a
are stacked in [PR #109](https://github.com/Elysia20220909/ElysiaAI/pull/109),
[PR #110](https://github.com/Elysia20220909/ElysiaAI/pull/110), and
[PR #111](https://github.com/Elysia20220909/ElysiaAI/pull/111).
Check those PRs for their adoption into the default branch.

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
