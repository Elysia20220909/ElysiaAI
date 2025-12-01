try {
	module.exports = require('./build/Release/elysia_native.node');
} catch (err) {
	console.warn('Native module not built. Run: npm install');
	// Fallback to JS implementations
	module.exports = {
		tokenize: (text) => text.toLowerCase().split(/\W+/).filter(Boolean),
		similarity: (vec1, vec2) => {
			const dot = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
			const mag1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
			const mag2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
			return mag1 && mag2 ? dot / (mag1 * mag2) : 0;
		},
		normalize: (text) => text.trim().toLowerCase().replace(/\s+/g, ' '),
	};
}
