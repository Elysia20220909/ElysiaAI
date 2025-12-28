try {
  module.exports = require('./build/Release/elysia_native.node');
} catch (err) {
  console.warn('Native module not built. Running in fallback mode.');

  // JavaScript fallback implementation
  module.exports = {
    normalize: (text) => {
      return text.trim().replace(/\s+/g, ' ');
    },

    tokenize: (text) => {
      return text.toLowerCase().split(/\W+/).filter(Boolean);
    },

    wordCount: (text) => {
      return text.trim().split(/\s+/).filter(Boolean).length;
    },

    libraryInfo: () => ({
      name: 'elysia-native-fallback',
      version: '1.0.0',
      os: process.platform,
      arch: process.arch
    })
  };
}
