const ffi = require('ffi-napi');
const path = require('path');
const fs = require('fs');

let cudaLib = null;

// Try to load CUDA library
const libPath = path.join(__dirname, 'build', 'elysia_cuda.dll');

if (fs.existsSync(libPath)) {
	try {
		cudaLib = ffi.Library(libPath, {
			'cudaComputeSimilarities': ['int', ['pointer', 'pointer', 'pointer', 'int', 'int', 'int']],
		});
		console.log('✅ CUDA acceleration enabled');
	} catch (error) {
		console.warn('⚠️  Failed to load CUDA library:', error.message);
	}
}

// Compute similarity matrix using CUDA (if available)
function computeSimilarities(queries, database) {
	if (!cudaLib) {
		console.warn('CUDA not available, using CPU fallback');
		return computeSimilaritiesCPU(queries, database);
	}

	const numQueries = queries.length;
	const numVectors = database.length;
	const dimension = queries[0].length;

	// Flatten arrays
	const queriesFlat = new Float32Array(numQueries * dimension);
	const databaseFlat = new Float32Array(numVectors * dimension);
	const results = new Float32Array(numQueries * numVectors);

	for (let i = 0; i < numQueries; i++) {
		for (let j = 0; j < dimension; j++) {
			queriesFlat[i * dimension + j] = queries[i][j];
		}
	}

	for (let i = 0; i < numVectors; i++) {
		for (let j = 0; j < dimension; j++) {
			databaseFlat[i * dimension + j] = database[i][j];
		}
	}

	// Call CUDA function
	const status = cudaLib.cudaComputeSimilarities(
		queriesFlat,
		databaseFlat,
		results,
		numQueries,
		numVectors,
		dimension
	);

	if (status !== 0) {
		console.error('CUDA computation failed, using CPU fallback');
		return computeSimilaritiesCPU(queries, database);
	}

	// Convert flat results to 2D array
	const output = [];
	for (let i = 0; i < numQueries; i++) {
		const row = [];
		for (let j = 0; j < numVectors; j++) {
			row.push(results[i * numVectors + j]);
		}
		output.push(row);
	}

	return output;
}

// CPU fallback implementation
function computeSimilaritiesCPU(queries, database) {
	return queries.map(query => 
		database.map(vector => cosineSimilarity(query, vector))
	);
}

function cosineSimilarity(vec1, vec2) {
	const dot = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
	const mag1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
	const mag2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
	return mag1 && mag2 ? dot / (mag1 * mag2) : 0;
}

module.exports = {
	computeSimilarities,
	isGPUAvailable: () => cudaLib !== null,
};
