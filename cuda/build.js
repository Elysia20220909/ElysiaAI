const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

console.log("🔧 Building CUDA module...");

// Check if CUDA is installed
try {
	execSync("nvcc --version", { stdio: "inherit" });
} catch {
	console.warn("⚠️  CUDA toolkit not found. Skipping CUDA build.");
	console.warn(
		"   Install CUDA from: https://developer.nvidia.com/cuda-downloads",
	);
	process.exit(0);
}

// Check if Visual Studio is available
try {
	execSync("where cl", { stdio: "pipe" });
} catch {
	console.warn("⚠️  Visual Studio not found. Skipping CUDA build.");
	console.warn("   Install Visual Studio with C++ tools.");
	process.exit(0);
}

// Build CUDA library
const srcDir = path.join(__dirname, "src");
const buildDir = path.join(__dirname, "build");

if (!fs.existsSync(buildDir)) {
	fs.mkdirSync(buildDir, { recursive: true });
}

try {
	console.log("Compiling CUDA kernels...");

	// Compile .cu to .obj
	execSync(
		`nvcc -c "${path.join(srcDir, "similarity.cu")}" ` +
			`-o "${path.join(buildDir, "similarity.obj")}" ` +
			`-arch=sm_75 -O3`,
		{ stdio: "inherit" },
	);

	// Link to DLL
	execSync(
		`nvcc -shared "${path.join(buildDir, "similarity.obj")}" ` +
			`-o "${path.join(buildDir, "elysia_cuda.dll")}"`,
		{ stdio: "inherit" },
	);

	console.log("✅ CUDA module built successfully!");
} catch (error) {
	console.error("❌ Build failed:", error.message);
	process.exit(1);
}
