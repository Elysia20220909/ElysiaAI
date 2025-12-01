const path = require('path');
const nodeExternals = require('webpack-node-externals');

// Only allow valid webpack modes
const VALID_MODES = ['production', 'development', 'none'];
const mode = VALID_MODES.includes(process.env.NODE_ENV) ? process.env.NODE_ENV : 'production';

module.exports = {
  mode,
  target: 'node',
  // tell webpack this is a Node build and don't bundle node_modules
  externalsPresets: { node: true },
    filename: 'bundle.js',
  entry: path.resolve(__dirname, 'src', 'index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
