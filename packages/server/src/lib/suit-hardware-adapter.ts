import { spawn } from "node:child_process";
import { platform } from "node:os";
import {
	planSuitEdgeCommand,
	type SuitEdgeCommandPlan,
} from "./suit-edge-runtime";

export const suitHardwareModes = ["locked", "dry_run", "enabled"] as const;
export const suitHardwareOperations = [
	"gpio_read",
	"gpio_write",
	"can_send",
] as const;

export type SuitHardwareMode = (typeof suitHardwareModes)[number];
export type SuitHardwareOperationKind = (typeof suitHardwareOperations)[number];
export type SuitHardwareDecision = "allow" | "confirm" | "deny";
export type SuitHardwareRunner = (
	file: string,
	args: string[],
	timeoutMs: number,
) => Promise<SuitHardwareCommandResult>;

export interface SuitHardwareOperationInput {
	operation: SuitHardwareOperationKind;
	targetNodeId: string;
	requestedBy: string;
	reason?: string;
	gpio?: {
		chip: string;
		line: number;
		value?: 0 | 1;
	};
	can?: {
		iface: string;
		id: string;
		dataHex: string;
	};
	manualConfirm?: boolean;
	armToken?: string;
}

export interface SuitHardwareCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
	timedOut: boolean;
}

export interface SuitHardwarePlan {
	id: string;
	operation: SuitHardwareOperationKind;
	targetNodeId: string;
	mode: SuitHardwareMode;
	decision: SuitHardwareDecision;
	command: string[];
	reasons: string[];
	controls: string[];
	requiresManualConfirm: boolean;
	executable: boolean;
	createdAt: string;
	expiresAt: string;
	edgePlan: SuitEdgeCommandPlan;
}

export interface SuitHardwareDispatchResult {
	ok: boolean;
	plan: SuitHardwarePlan;
	result: SuitHardwareCommandResult | null;
	audit: {
		id: string;
		at: string;
		executed: boolean;
		mode: SuitHardwareMode;
		operation: SuitHardwareOperationKind;
	};
}

export interface SuitHardwareStatus {
	id: "suit-hardware-adapter";
	platform: string;
	mode: SuitHardwareMode;
	enabled: boolean;
	tools: {
		gpioRead: string;
		gpioWrite: string;
		canSend: string;
	};
	allowlist: {
		gpio: string[];
		can: string[];
	};
	hardRules: string[];
}

export class SuitHardwareAdapterError extends Error {
	constructor(
		message: string,
		readonly code: string,
	) {
		super(message);
		this.name = "SuitHardwareAdapterError";
	}
}

const GPIO_CHIP_PATTERN = /^gpiochip\d+$/;
const CAN_IFACE_PATTERN = /^[a-zA-Z0-9_.:-]{1,24}$/;
const CAN_ID_PATTERN = /^[0-9a-fA-F]{1,8}$/;
const CAN_DATA_PATTERN = /^[0-9a-fA-F]*$/;

function randomId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hardwareMode(): SuitHardwareMode {
	const value = (process.env.ELYSIA_SUIT_HARDWARE_MODE || "locked")
		.trim()
		.toLowerCase();
	return suitHardwareModes.includes(value as SuitHardwareMode)
		? (value as SuitHardwareMode)
		: "locked";
}

function hardwarePlatform(): string {
	return process.env.ELYSIA_SUIT_HARDWARE_PLATFORM || platform();
}

function splitAllowlist(value: string | undefined): string[] {
	return String(value || "")
		.split(/[,\n;]/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function gpioAllowlist(): string[] {
	return splitAllowlist(process.env.ELYSIA_SUIT_GPIO_ALLOWLIST);
}

function canAllowlist(): string[] {
	return splitAllowlist(process.env.ELYSIA_SUIT_CAN_ALLOWLIST).map((item) =>
		item.toLowerCase(),
	);
}

function gpioKey(chip: string, line: number, direction: "read" | "write") {
	return `${chip}:${line}:${direction}`;
}

function canKey(iface: string, id: string) {
	return `${iface}:${id.toLowerCase()}`;
}

function isArmTokenAccepted(input?: string): boolean {
	const expected = process.env.ELYSIA_SUIT_HARDWARE_ARM_TOKEN;
	return Boolean(expected) && Boolean(input) && input === expected;
}

function assertOperationInput(
	input: SuitHardwareOperationInput,
): asserts input is SuitHardwareOperationInput {
	if (!suitHardwareOperations.includes(input.operation)) {
		throw new SuitHardwareAdapterError(
			"Hardware operation is invalid",
			"SUIT_HARDWARE_OPERATION_INVALID",
		);
	}
	if (!input.targetNodeId.trim()) {
		throw new SuitHardwareAdapterError(
			"targetNodeId is required",
			"SUIT_HARDWARE_TARGET_REQUIRED",
		);
	}
	if (!input.requestedBy.trim()) {
		throw new SuitHardwareAdapterError(
			"requestedBy is required",
			"SUIT_HARDWARE_OPERATOR_REQUIRED",
		);
	}
}

function assertGpio(
	gpio: SuitHardwareOperationInput["gpio"],
	needsValue: boolean,
) {
	if (
		!gpio ||
		!GPIO_CHIP_PATTERN.test(gpio.chip) ||
		!Number.isInteger(gpio.line)
	) {
		throw new SuitHardwareAdapterError(
			"GPIO target is invalid",
			"SUIT_HARDWARE_GPIO_INVALID",
		);
	}
	if (gpio.line < 0 || gpio.line > 512) {
		throw new SuitHardwareAdapterError(
			"GPIO line is out of range",
			"SUIT_HARDWARE_GPIO_INVALID",
		);
	}
	if (needsValue && gpio.value !== 0 && gpio.value !== 1) {
		throw new SuitHardwareAdapterError(
			"GPIO value must be 0 or 1",
			"SUIT_HARDWARE_GPIO_INVALID",
		);
	}
}

function assertCan(can: SuitHardwareOperationInput["can"]) {
	if (
		!can ||
		!CAN_IFACE_PATTERN.test(can.iface) ||
		!CAN_ID_PATTERN.test(can.id) ||
		!CAN_DATA_PATTERN.test(can.dataHex) ||
		can.dataHex.length % 2 !== 0 ||
		can.dataHex.length > 16
	) {
		throw new SuitHardwareAdapterError(
			"CAN target is invalid",
			"SUIT_HARDWARE_CAN_INVALID",
		);
	}
}

function commandFor(input: SuitHardwareOperationInput): string[] {
	if (input.operation === "gpio_read") {
		assertGpio(input.gpio, false);
		const gpio = input.gpio;
		if (!gpio)
			throw new SuitHardwareAdapterError(
				"GPIO target is invalid",
				"SUIT_HARDWARE_GPIO_INVALID",
			);
		return [
			process.env.ELYSIA_SUIT_GPIO_GET_BIN || "gpioget",
			gpio.chip,
			String(gpio.line),
		];
	}
	if (input.operation === "gpio_write") {
		assertGpio(input.gpio, true);
		const gpio = input.gpio;
		if (!gpio)
			throw new SuitHardwareAdapterError(
				"GPIO target is invalid",
				"SUIT_HARDWARE_GPIO_INVALID",
			);
		return [
			process.env.ELYSIA_SUIT_GPIO_SET_BIN || "gpioset",
			gpio.chip,
			`${gpio.line}=${gpio.value}`,
		];
	}

	assertCan(input.can);
	const can = input.can;
	if (!can)
		throw new SuitHardwareAdapterError(
			"CAN target is invalid",
			"SUIT_HARDWARE_CAN_INVALID",
		);
	return [
		process.env.ELYSIA_SUIT_CAN_SEND_BIN || "cansend",
		can.iface,
		`${can.id.toUpperCase()}#${can.dataHex.toUpperCase()}`,
	];
}

function edgeCommandFor(input: SuitHardwareOperationInput) {
	if (input.operation === "gpio_read") return "read_telemetry";
	if (input.operation === "gpio_write") return "arm_safety_relay";
	return "run_diagnostics";
}

function isAllowlisted(input: SuitHardwareOperationInput): boolean {
	if (input.operation === "gpio_read") {
		assertGpio(input.gpio, false);
		const gpio = input.gpio;
		if (!gpio) return false;
		return gpioAllowlist().includes(gpioKey(gpio.chip, gpio.line, "read"));
	}
	if (input.operation === "gpio_write") {
		assertGpio(input.gpio, true);
		const gpio = input.gpio;
		if (!gpio) return false;
		return gpioAllowlist().includes(gpioKey(gpio.chip, gpio.line, "write"));
	}
	assertCan(input.can);
	const can = input.can;
	if (!can) return false;
	return canAllowlist().includes(canKey(can.iface, can.id));
}

function commandRequiresConfirm(operation: SuitHardwareOperationKind): boolean {
	return operation === "gpio_write" || operation === "can_send";
}

export function buildSuitHardwareStatus(): SuitHardwareStatus {
	const mode = hardwareMode();
	return {
		id: "suit-hardware-adapter",
		platform: hardwarePlatform(),
		mode,
		enabled: mode === "enabled",
		tools: {
			gpioRead: process.env.ELYSIA_SUIT_GPIO_GET_BIN || "gpioget",
			gpioWrite: process.env.ELYSIA_SUIT_GPIO_SET_BIN || "gpioset",
			canSend: process.env.ELYSIA_SUIT_CAN_SEND_BIN || "cansend",
		},
		allowlist: {
			gpio: gpioAllowlist(),
			can: canAllowlist(),
		},
		hardRules: [
			"locked by default",
			"Linux hardware tools only",
			"GPIO/CAN writes require allowlist, manual confirm, and arm token",
			"no shell execution; command arguments are passed as arrays",
			"motion actuation remains outside the software-safe boundary",
		],
	};
}

export function planSuitHardwareOperation(
	input: SuitHardwareOperationInput,
	now: Date = new Date(),
): SuitHardwarePlan {
	assertOperationInput(input);
	const command = commandFor(input);
	const mode = hardwareMode();
	const edgePlan = planSuitEdgeCommand(
		{
			targetNodeId: input.targetNodeId,
			command: edgeCommandFor(input),
			requestedBy: input.requestedBy,
			reason: input.reason,
			payload: {
				operation: input.operation,
			},
		},
		now,
	);

	const reasons: string[] = [];
	const controls = [
		"neural auth",
		"edge runtime plan",
		"hardware allowlist",
		"manual confirm for writes",
		"arm token for enabled writes",
		"no shell execution",
	];
	let decision: SuitHardwareDecision = "allow";

	if (mode === "locked") {
		decision = "deny";
		reasons.push("hardware adapter is locked");
	} else if (hardwarePlatform() !== "linux" && mode === "enabled") {
		decision = "deny";
		reasons.push("real GPIO/CAN dispatch is Linux-only");
	} else if (!isAllowlisted(input)) {
		decision = "deny";
		reasons.push("hardware target is not allowlisted");
	} else if (edgePlan.decision === "deny") {
		decision = "deny";
		reasons.push("edge runtime policy denied the operation");
	} else if (commandRequiresConfirm(input.operation)) {
		if (mode === "dry_run") {
			decision = "confirm";
			reasons.push("hardware write is dry-run only until enabled");
		} else if (!input.manualConfirm || !isArmTokenAccepted(input.armToken)) {
			decision = "confirm";
			reasons.push("hardware write requires manual confirm and arm token");
		} else {
			reasons.push("hardware write is armed and allowlisted");
		}
	} else {
		reasons.push("hardware read is allowlisted");
	}

	const executable = decision === "allow" && mode === "enabled";

	return {
		id: randomId("hw-plan"),
		operation: input.operation,
		targetNodeId: input.targetNodeId,
		mode,
		decision,
		command,
		reasons,
		controls,
		requiresManualConfirm: decision === "confirm",
		executable,
		createdAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + 10_000).toISOString(),
		edgePlan,
	};
}

export async function dispatchSuitHardwareOperation(
	input: SuitHardwareOperationInput,
	options: {
		now?: Date;
		runner?: SuitHardwareRunner;
		timeoutMs?: number;
	} = {},
): Promise<SuitHardwareDispatchResult> {
	const plan = planSuitHardwareOperation(input, options.now ?? new Date());
	let result: SuitHardwareCommandResult | null = null;

	if (plan.executable) {
		const [file, ...args] = plan.command;
		const runner = options.runner ?? runHardwareCommand;
		result = await runner(file, args, options.timeoutMs ?? 1500);
	}

	return {
		ok: plan.executable && result?.exitCode === 0,
		plan,
		result,
		audit: {
			id: randomId("hw-audit"),
			at: new Date().toISOString(),
			executed: result !== null,
			mode: plan.mode,
			operation: input.operation,
		},
	};
}

export function normalizeSuitHardwareBody(
	value: unknown,
	requestedBy: string,
): SuitHardwareOperationInput {
	if (!isRecord(value) || typeof value.operation !== "string") {
		throw new SuitHardwareAdapterError(
			"Hardware request body is invalid",
			"SUIT_HARDWARE_BODY_INVALID",
		);
	}
	return {
		operation: value.operation as SuitHardwareOperationKind,
		targetNodeId:
			typeof value.targetNodeId === "string" ? value.targetNodeId : "",
		requestedBy,
		reason: typeof value.reason === "string" ? value.reason : undefined,
		manualConfirm: value.manualConfirm === true,
		armToken: typeof value.armToken === "string" ? value.armToken : undefined,
		gpio: isRecord(value.gpio)
			? {
					chip: typeof value.gpio.chip === "string" ? value.gpio.chip : "",
					line:
						typeof value.gpio.line === "number"
							? Math.trunc(value.gpio.line)
							: -1,
					value:
						value.gpio.value === 0 || value.gpio.value === 1
							? value.gpio.value
							: undefined,
				}
			: undefined,
		can: isRecord(value.can)
			? {
					iface: typeof value.can.iface === "string" ? value.can.iface : "",
					id: typeof value.can.id === "string" ? value.can.id : "",
					dataHex:
						typeof value.can.dataHex === "string" ? value.can.dataHex : "",
				}
			: undefined,
	};
}

function runHardwareCommand(
	file: string,
	args: string[],
	timeoutMs: number,
): Promise<SuitHardwareCommandResult> {
	return new Promise((resolve) => {
		const child = spawn(file, args, {
			shell: false,
			windowsHide: true,
		});
		const stdout: Buffer[] = [];
		const stderr: Buffer[] = [];
		let settled = false;
		const timer = setTimeout(() => {
			if (settled) return;
			settled = true;
			child.kill("SIGTERM");
			resolve({
				exitCode: 124,
				stdout: Buffer.concat(stdout).toString("utf8"),
				stderr: Buffer.concat(stderr).toString("utf8"),
				timedOut: true,
			});
		}, timeoutMs);

		child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
		child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
		child.on("error", (error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({
				exitCode: 127,
				stdout: Buffer.concat(stdout).toString("utf8"),
				stderr: error.message,
				timedOut: false,
			});
		});
		child.on("close", (code) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({
				exitCode: code ?? 1,
				stdout: Buffer.concat(stdout).toString("utf8"),
				stderr: Buffer.concat(stderr).toString("utf8"),
				timedOut: false,
			});
		});
	});
}
