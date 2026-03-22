import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { logger } from "./logger";

const execAsync = promisify(exec);

// Path points to the scripts directory in the server package
export const INFRA_SCRIPTS_DIR = path.join(process.cwd(), "scripts", "infra");

export interface InfraResponse {
	success: boolean;
	stdout: string;
	stderr: string;
}

/**
 * Execute a pvese infrastructure script.
 * Note: Assumes a POSIX-compliant shell (bash) is available in the environment.
 */
export async function runInfraScript(
	scriptRelativePath: string,
	args: string[] = [],
): Promise<InfraResponse> {
	// e.g. scriptRelativePath: "issue.sh" or "scripts/bmc-power.sh"
	const scriptPath = path.join(INFRA_SCRIPTS_DIR, scriptRelativePath);
	const safeArgs = args
		.map((a) => `"${a.replace(/(["\s'$`\\])/g, "\\$1")}"`)
		.join(" ");

	const command = `bash "${scriptPath}" ${safeArgs}`;

	try {
		logger.info(`[InfraOps] Executing script: ${command}`);
		const { stdout, stderr } = await execAsync(command, {
			cwd: INFRA_SCRIPTS_DIR, // Execute in the infra folder to respect relative paths in pvese
		});
		return { success: true, stdout, stderr };
		// biome-ignore lint/suspicious/noExplicitAny: error object parsing
	} catch (error: any) {
		logger.error(`[InfraOps] Script failed: ${command}`, error);
		return {
			success: false,
			stdout: error.stdout || "",
			stderr: error.stderr || error.message || "Unknown error",
		};
	}
}

/**
 * Retrieve issue tracking data from pvese's built-in issue management.
 */
export async function getInfraIssues(): Promise<InfraResponse> {
	return runInfraScript("issue.sh", ["list"]);
}

/**
 * Check the power status of a specific server/node.
 * @param nodeConfig e.g. "server4.yml"
 */
export async function getPowerStatus(
	nodeConfig: string,
): Promise<InfraResponse> {
	return runInfraScript("scripts/bmc-power.sh", [
		"status",
		`config/${nodeConfig}`,
	]);
}

/**
 * Check LINSTOR benchmarking multi-region status.
 */
export async function getLinstorStatus(): Promise<InfraResponse> {
	return runInfraScript("scripts/linstor-multiregion-status.sh", []);
}
