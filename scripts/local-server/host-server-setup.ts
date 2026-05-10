#!/usr/bin/env bun
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Options = {
  targetDir: string;
  sourceDir: string;
  bindIp: string;
  timezone: string;
  domainSuffix: string;
  pullModel: string;
  start: boolean;
  validateOnly: boolean;
  noCopy: boolean;
  noPull: boolean;
  skipDockerRuntime: boolean;
  help: boolean;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

const options: Options = {
  targetDir: join(homedir(), "elisia-core-host"),
  sourceDir: join(repoRoot, "deploy", "elisia-core"),
  bindIp: "127.0.0.1",
  timezone: "Asia/Tokyo",
  domainSuffix: "home.arpa",
  pullModel: "llama3.2",
  start: false,
  validateOnly: false,
  noCopy: false,
  noPull: false,
  skipDockerRuntime: false,
  help: false,
};

function usage(): void {
  console.log(`E.L.I.S.I.A. Windows/macOS host server setup.

Usage:
  bun scripts/local-server/host-server-setup.ts [options]

Safe default:
  Copies deploy/elisia-core into ~/elisia-core-host, creates .env, generates
  local secrets, validates Docker Compose, and does not start containers.

Options:
  --target-dir DIR            Host deployment directory. Default: ~/elisia-core-host
  --source-dir DIR            Source deploy/elisia-core directory
  --bind-ip IP                Bind exposed ports. Default: 127.0.0.1
  --timezone TZ               Timezone. Default: Asia/Tokyo
  --domain-suffix NAME        Service suffix. Default: home.arpa
  --pull-model MODEL          Ollama model pulled when --start is set. Default: llama3.2
  --start                     Start containers after validation
  --validate-only             Validate existing target files only
  --no-copy                   Do not copy deploy files before setup
  --no-pull                   Skip docker compose pull
  --skip-docker-runtime       Skip Docker-dependent hash/password/compose steps
  -h, --help                  Show this help

Examples:
  # Prepare locally without starting containers
  bun scripts/local-server/host-server-setup.ts

  # Prepare for LAN use, then start
  bun scripts/local-server/host-server-setup.ts --bind-ip 10.10.20.30 --start

  # Local-only browser test with localhost names
  bun scripts/local-server/host-server-setup.ts --domain-suffix localhost --start
`);
}

function parseArgs(args: string[]): void {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = () => {
      index += 1;
      const value = args[index];
      if (!value) throw new Error(`Missing value for ${arg}`);
      return value;
    };

    switch (arg) {
      case "--target-dir":
        options.targetDir = resolve(next());
        break;
      case "--source-dir":
        options.sourceDir = resolve(next());
        break;
      case "--bind-ip":
        options.bindIp = next();
        break;
      case "--timezone":
        options.timezone = next();
        break;
      case "--domain-suffix":
        options.domainSuffix = next();
        break;
      case "--pull-model":
        options.pullModel = next();
        break;
      case "--start":
        options.start = true;
        break;
      case "--validate-only":
        options.validateOnly = true;
        break;
      case "--no-copy":
        options.noCopy = true;
        break;
      case "--no-pull":
        options.noPull = true;
        break;
      case "--skip-docker-runtime":
        options.skipDockerRuntime = true;
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
}

function log(message: string): void {
  console.log(`\n==> ${message}`);
}

function run(command: string, args: string[], cwd = options.targetDir): void {
  log(`${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? "unknown"}`);
  }
}

function capture(command: string, args: string[], cwd = options.targetDir): string {
  log(`${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { cwd, encoding: "utf8", shell: false });
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    throw new Error(`${command} failed with exit code ${result.status ?? "unknown"}`);
  }
  return (result.stdout ?? "").trim();
}

function randomHex(): string {
  return randomBytes(32).toString("hex");
}

function randomB64(): string {
  return randomBytes(32).toString("base64");
}

function renderEnvValue(value: string): string {
  if (/[\s#$]/.test(value)) {
    if (value.includes("'")) throw new Error("Cannot render .env value containing a single quote");
    return `'${value}'`;
  }
  return value;
}

function readEnvValue(lines: string[], key: string): string {
  const prefix = `${key}=`;
  const line = [...lines].reverse().find((item) => item.startsWith(prefix));
  if (!line) return "";
  let value = line.slice(prefix.length);
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function setEnvValue(lines: string[], key: string, value: string): string[] {
  const rendered = `${key}=${renderEnvValue(value)}`;
  let updated = false;
  const next = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      updated = true;
      return rendered;
    }
    return line;
  });
  if (!updated) next.push(rendered);
  return next;
}

function isPlaceholder(value: string): boolean {
  return !value || value.startsWith("replace-with-");
}

function copyDeployFiles(): void {
  log(`Copying deploy files to ${options.targetDir}`);
  mkdirSync(options.targetDir, { recursive: true });
  for (const entry of readdirSync(options.sourceDir, { withFileTypes: true })) {
    const from = join(options.sourceDir, entry.name);
    const to = join(options.targetDir, entry.name);
    cpSync(from, to, { recursive: true, force: true });
  }
}

function ensureDirectories(): void {
  for (const dir of [
    "backups",
    "caddy",
    "homepage/config",
    "homepage/icons",
    "prometheus",
    "grafana/provisioning/datasources",
    "mosquitto/config",
    "mosquitto/data",
    "mosquitto/log",
  ]) {
    mkdirSync(join(options.targetDir, dir), { recursive: true });
  }
}

function ensureEnv(): string[] {
  const envPath = join(options.targetDir, ".env");
  const examplePath = join(options.targetDir, ".env.example");
  if (!existsSync(envPath)) {
    log("Creating .env from .env.example");
    copyFileSync(examplePath, envPath);
    try {
      chmodSync(envPath, 0o600);
    } catch {
      // Windows may ignore POSIX mode changes.
    }
  }

  let lines = readFileSync(envPath, "utf8").replace(/\r\n/g, "\n").split("\n");
  lines = setEnvValue(lines, "BIND_IP", options.bindIp);
  lines = setEnvValue(lines, "TZ", options.timezone);
  lines = setEnvValue(lines, "DOMAIN_AI", `ai.${options.domainSuffix}`);
  lines = setEnvValue(lines, "DOMAIN_HA", `ha.${options.domainSuffix}`);
  lines = setEnvValue(lines, "DOMAIN_STATUS", `status.${options.domainSuffix}`);
  lines = setEnvValue(lines, "DOMAIN_DASH", `dash.${options.domainSuffix}`);
  lines = setEnvValue(lines, "DOMAIN_GIT", `git.${options.domainSuffix}`);
  lines = setEnvValue(lines, "DOMAIN_N8N", `n8n.${options.domainSuffix}`);
  lines = setEnvValue(lines, "DOMAIN_GRAFANA", `grafana.${options.domainSuffix}`);
  lines = setEnvValue(lines, "DOMAIN_PROMETHEUS", `prometheus.${options.domainSuffix}`);

  const secrets: Array<[string, () => string]> = [
    ["WEBUI_SECRET_KEY", randomHex],
    ["GITEA_DB_PASSWORD", randomB64],
    ["N8N_DB_PASSWORD", randomB64],
    ["N8N_ENCRYPTION_KEY", randomB64],
    ["GRAFANA_ADMIN_PASSWORD", randomB64],
    ["MQTT_PASSWORD", randomB64],
  ];

  for (const [key, generator] of secrets) {
    if (isPlaceholder(readEnvValue(lines, key))) {
      lines = setEnvValue(lines, key, generator());
    }
  }

  writeFileSync(envPath, `${lines.join("\n").replace(/\n+$/g, "")}\n`, "utf8");
  return lines;
}

function ensureCaddyHash(lines: string[]): string[] {
  const current = readEnvValue(lines, "BASIC_AUTH_HASH");
  if (!isPlaceholder(current)) return lines;

  const password = randomB64();
  const caddyImage = readEnvValue(lines, "CADDY_IMAGE") || "caddy:2";
  const hash = capture("docker", ["run", "--rm", caddyImage, "caddy", "hash-password", "--plaintext", password]);
  const secretsPath = join(options.targetDir, "setup-secrets.txt");
  const existing = existsSync(secretsPath) ? readFileSync(secretsPath, "utf8") : "";
  writeFileSync(
    secretsPath,
    `${existing}${existing ? "" : "# Store these in a password manager, then delete this file.\n"}BASIC_AUTH_PASSWORD=${password}\n`,
    "utf8",
  );
  return setEnvValue(lines, "BASIC_AUTH_HASH", hash);
}

function ensureMosquittoPassword(lines: string[]): void {
  const username = readEnvValue(lines, "MQTT_USERNAME") || "homeassistant";
  const password = readEnvValue(lines, "MQTT_PASSWORD");
  const image = readEnvValue(lines, "MOSQUITTO_IMAGE") || "eclipse-mosquitto:2";
  const configDir = join(options.targetDir, "mosquitto", "config");
  run("docker", [
    "run",
    "--rm",
    "-v",
    `${configDir}:/mosquitto/config`,
    image,
    "mosquitto_passwd",
    "-b",
    "-c",
    "/mosquitto/config/passwords",
    username,
    password,
  ]);
}

function main(): void {
  parseArgs(Bun.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  options.sourceDir = resolve(options.sourceDir);
  options.targetDir = resolve(options.targetDir);

  if (!existsSync(join(options.sourceDir, "compose.yaml"))) {
    throw new Error(`compose.yaml not found in source dir: ${options.sourceDir}`);
  }
  if (!existsSync(join(options.sourceDir, ".env.example"))) {
    throw new Error(`.env.example not found in source dir: ${options.sourceDir}`);
  }

  console.log("E.L.I.S.I.A. host server setup");
  console.log(`Target: ${options.targetDir}`);
  console.log(`Bind:   ${options.bindIp}`);
  console.log(`Mode:   ${options.start ? "start" : options.validateOnly ? "validate-only" : "prepare-no-start"}`);

  if (!options.noCopy && !options.validateOnly) copyDeployFiles();
  ensureDirectories();

  let lines = ensureEnv();

  if (!options.skipDockerRuntime) {
    lines = ensureCaddyHash(lines);
    writeFileSync(join(options.targetDir, ".env"), `${lines.join("\n").replace(/\n+$/g, "")}\n`, "utf8");
    ensureMosquittoPassword(lines);
    run("docker", ["compose", "-f", "compose.yaml", "config", "--quiet"]);

    if (options.start) {
      if (!options.noPull) run("docker", ["compose", "-f", "compose.yaml", "pull"]);
      run("docker", ["compose", "-f", "compose.yaml", "up", "-d"]);
      if (options.pullModel) {
        run("docker", ["compose", "-f", "compose.yaml", "exec", "-T", "ollama", "ollama", "pull", options.pullModel]);
      }
    } else {
      log("Prepared without starting containers");
    }
  } else {
    log("Skipped Docker runtime steps");
  }

  console.log("\nDone. Keep .env and setup-secrets.txt out of Git.");
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
