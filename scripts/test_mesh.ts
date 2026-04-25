import { meshOrchestrator } from "../packages/sovereign-mesh/src/mesh_orchestrator";
import { logger } from "../packages/server/src/lib/logger";

/**
 * 🧪 SMIN Mesh Test Runner
 * "Igniting the Lattice."
 */
async function main() {
    logger.info("🚀 Starting Mesh Orchestration Test...");
    
    // Wait for nodes to initialize
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    try {
        const result = await meshOrchestrator.deployOnionCircuit("TOP_SECRET_ABYSSAL_INTEL");
        logger.info(`✨ Deployment Result: ${result}`);
    } catch (e) {
        logger.error("🛑 Mesh deployment failed", e as Error);
    }
}

main();
