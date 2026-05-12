import { afterEach, describe, expect, test } from "bun:test";
import {
	buildSuitHardwareStatus,
	dispatchSuitHardwareOperation,
	planSuitHardwareOperation,
} from "./suit-hardware-adapter";

const envKeys = [
	"ELYSIA_SUIT_HARDWARE_MODE",
	"ELYSIA_SUIT_HARDWARE_PLATFORM",
	"ELYSIA_SUIT_GPIO_ALLOWLIST",
	"ELYSIA_SUIT_CAN_ALLOWLIST",
	"ELYSIA_SUIT_HARDWARE_ARM_TOKEN",
] as const;
const originalEnv = new Map<string, string | undefined>();

for (const key of envKeys) {
	originalEnv.set(key, process.env[key]);
}

afterEach(() => {
	for (const key of envKeys) {
		const value = originalEnv.get(key);
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
});

function configureHardwareEnv(mode: "locked" | "dry_run" | "enabled") {
	process.env.ELYSIA_SUIT_HARDWARE_MODE = mode;
	process.env.ELYSIA_SUIT_HARDWARE_PLATFORM = "linux";
	process.env.ELYSIA_SUIT_GPIO_ALLOWLIST =
		"gpiochip0:17:read,gpiochip0:27:write";
	process.env.ELYSIA_SUIT_CAN_ALLOWLIST = "can0:123";
	process.env.ELYSIA_SUIT_HARDWARE_ARM_TOKEN = "arm-test-token";
}

describe("suit hardware adapter", () => {
	test("is locked by default", () => {
		delete process.env.ELYSIA_SUIT_HARDWARE_MODE;
		const status = buildSuitHardwareStatus();

		expect(status.mode).toBe("locked");
		expect(status.enabled).toBe(false);
	});

	test("denies hardware plans while locked", () => {
		configureHardwareEnv("locked");
		const plan = planSuitHardwareOperation({
			operation: "gpio_read",
			targetNodeId: "safety-relay",
			requestedBy: "operator",
			gpio: { chip: "gpiochip0", line: 17 },
		});

		expect(plan.decision).toBe("deny");
		expect(plan.executable).toBe(false);
	});

	test("plans allowlisted GPIO reads in dry-run mode without executing", async () => {
		configureHardwareEnv("dry_run");
		const dispatch = await dispatchSuitHardwareOperation({
			operation: "gpio_read",
			targetNodeId: "safety-relay",
			requestedBy: "operator",
			gpio: { chip: "gpiochip0", line: 17 },
		});

		expect(dispatch.plan.decision).toBe("allow");
		expect(dispatch.plan.command).toEqual(["gpioget", "gpiochip0", "17"]);
		expect(dispatch.result).toBeNull();
		expect(dispatch.audit.executed).toBe(false);
	});

	test("requires confirmation and arm token for GPIO writes", () => {
		configureHardwareEnv("enabled");
		const plan = planSuitHardwareOperation({
			operation: "gpio_write",
			targetNodeId: "safety-relay",
			requestedBy: "operator",
			gpio: { chip: "gpiochip0", line: 27, value: 1 },
		});

		expect(plan.decision).toBe("confirm");
		expect(plan.executable).toBe(false);
	});

	test("executes allowlisted armed GPIO writes through an injected runner", async () => {
		configureHardwareEnv("enabled");
		const calls: Array<{ file: string; args: string[] }> = [];
		const dispatch = await dispatchSuitHardwareOperation(
			{
				operation: "gpio_write",
				targetNodeId: "safety-relay",
				requestedBy: "operator",
				gpio: { chip: "gpiochip0", line: 27, value: 1 },
				manualConfirm: true,
				armToken: "arm-test-token",
			},
			{
				runner: async (file, args) => {
					calls.push({ file, args });
					return { exitCode: 0, stdout: "", stderr: "", timedOut: false };
				},
			},
		);

		expect(dispatch.ok).toBe(true);
		expect(calls).toEqual([{ file: "gpioset", args: ["gpiochip0", "27=1"] }]);
	});

	test("builds safe SocketCAN send commands only for allowlisted ids", async () => {
		configureHardwareEnv("enabled");
		const dispatch = await dispatchSuitHardwareOperation(
			{
				operation: "can_send",
				targetNodeId: "power-mcu-torso",
				requestedBy: "operator",
				can: { iface: "can0", id: "123", dataHex: "0102A0" },
				manualConfirm: true,
				armToken: "arm-test-token",
			},
			{
				runner: async (file, args) => ({
					exitCode: file === "cansend" && args[1] === "123#0102A0" ? 0 : 1,
					stdout: "",
					stderr: "",
					timedOut: false,
				}),
			},
		);

		expect(dispatch.ok).toBe(true);
		expect(dispatch.plan.command).toEqual(["cansend", "can0", "123#0102A0"]);
	});

	test("denies non-allowlisted hardware targets", () => {
		configureHardwareEnv("enabled");
		const plan = planSuitHardwareOperation({
			operation: "can_send",
			targetNodeId: "power-mcu-torso",
			requestedBy: "operator",
			can: { iface: "can0", id: "999", dataHex: "0102" },
			manualConfirm: true,
			armToken: "arm-test-token",
		});

		expect(plan.decision).toBe("deny");
		expect(plan.reasons.join(" ")).toContain("not allowlisted");
	});
});
