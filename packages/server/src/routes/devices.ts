import { Elysia, t } from "elysia";

export type DeviceKind =
	| "windows-pc"
	| "mac"
	| "server"
	| "raspberry-pi"
	| "esp32"
	| "ups";

export type DeviceStatus = {
	id: string;
	name: string;
	kind: DeviceKind;
	online: boolean;
	cpuTemp?: number;
	gpuTemp?: number;
	diskFreeGb?: number;
	diskTotalGb?: number;
	memoryUsagePercent?: number;
	networkLatencyMs?: number;
	health: "nominal" | "warning" | "critical";
	notes: string[];
	lastSeenAt: string;
};

const now = () => new Date().toISOString();

const demoDevices: DeviceStatus[] = [
	{
		id: "win-gaming-core",
		name: "Windows Gaming PC",
		kind: "windows-pc",
		online: true,
		cpuTemp: 57,
		gpuTemp: 64,
		diskFreeGb: 182,
		diskTotalGb: 2000,
		memoryUsagePercent: 48,
		networkLatencyMs: 8,
		health: "nominal",
		notes: [
			"Primary workstation online",
			"GPU temperature within expected range",
		],
		lastSeenAt: now(),
	},
	{
		id: "mac-studio-core",
		name: "Mac Studio",
		kind: "mac",
		online: true,
		cpuTemp: 43,
		diskFreeGb: 512,
		diskTotalGb: 2000,
		memoryUsagePercent: 36,
		networkLatencyMs: 6,
		health: "nominal",
		notes: ["Creative node ready"],
		lastSeenAt: now(),
	},
	{
		id: "raspi-sensor-01",
		name: "Raspberry Pi Sensor Node 01",
		kind: "raspberry-pi",
		online: true,
		cpuTemp: 49,
		diskFreeGb: 18,
		diskTotalGb: 64,
		memoryUsagePercent: 31,
		networkLatencyMs: 12,
		health: "nominal",
		notes: ["Room telemetry active"],
		lastSeenAt: now(),
	},
];

function classifyDevice(device: DeviceStatus): DeviceStatus {
	const notes = [...device.notes];
	let health: DeviceStatus["health"] = device.health;

	if (typeof device.cpuTemp === "number" && device.cpuTemp >= 85) {
		health = "critical";
		notes.push("CPU temperature is critical");
	} else if (typeof device.cpuTemp === "number" && device.cpuTemp >= 75) {
		health = health === "critical" ? health : "warning";
		notes.push("CPU temperature is elevated");
	}

	if (
		typeof device.diskFreeGb === "number" &&
		typeof device.diskTotalGb === "number" &&
		device.diskTotalGb > 0
	) {
		const freePercent = (device.diskFreeGb / device.diskTotalGb) * 100;
		if (freePercent <= 5) {
			health = "critical";
			notes.push("SSD free space is critically low");
		} else if (freePercent <= 12) {
			health = health === "critical" ? health : "warning";
			notes.push("SSD free space is getting low");
		}
	}

	return { ...device, health, notes };
}

function buildFleetReport(devices: DeviceStatus[]) {
	const analyzed = devices.map(classifyDevice);
	const critical = analyzed.filter((device) => device.health === "critical");
	const warning = analyzed.filter((device) => device.health === "warning");

	return {
		generatedAt: now(),
		summary: {
			total: analyzed.length,
			online: analyzed.filter((device) => device.online).length,
			warning: warning.length,
			critical: critical.length,
		},
		devices: analyzed,
		nextActions: [
			...critical.map((device) => `Inspect ${device.name} immediately`),
			...warning.map(
				(device) => `Review ${device.name} during next maintenance window`,
			),
			"Keep external control actions disabled until human approval is implemented",
		],
	};
}

export const deviceRoutes = new Elysia({ prefix: "/api/devices" })
	.get("/", () => buildFleetReport(demoDevices))
	.get(
		"/:id/status",
		({ params }) => {
			const device = demoDevices.find((item) => item.id === params.id);

			if (!device) {
				return {
					ok: false,
					error: "DEVICE_NOT_FOUND",
					message: `Device ${params.id} was not found`,
				};
			}

			return {
				ok: true,
				device: classifyDevice(device),
			};
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	)
	.post(
		"/:id/check",
		({ params }) => {
			const device = demoDevices.find((item) => item.id === params.id);

			if (!device) {
				return {
					ok: false,
					error: "DEVICE_NOT_FOUND",
					message: `Device ${params.id} was not found`,
				};
			}

			const analyzed = classifyDevice({ ...device, lastSeenAt: now() });

			return {
				ok: true,
				checkedAt: now(),
				device: analyzed,
				recommendation:
					analyzed.health === "nominal"
						? "No immediate action required"
						: "Review device diagnostics and confirm before running any remediation",
			};
		},
		{
			params: t.Object({
				id: t.String(),
			}),
		},
	);
