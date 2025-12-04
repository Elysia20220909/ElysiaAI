/**
 * Webpack Configuration for Elysia AI Server
 * Production build: bun run build
 * Development: NODE_ENV=development bun run build
 */
const path = require("node:path");
const nodeExternals = require("webpack-node-externals");

// ==================== 設定定数 ====================
const VALID_MODES = ["production", "development", "none"];
const BUILD_MODE = VALID_MODES.includes(process.env.NODE_ENV)
	? process.env.NODE_ENV
	: "production";

const EXCLUDE_DIRS = [
	/node_modules/, // 外部依存
	/mobile/, // React Native アプリ
	/desktop/, // Electron アプリ
	/native/, // C++ ネイティブモジュール
	/cuda/, // CUDA GPU モジュール
	/python/, // Python バックエンド
];

// ==================== Webpack設定 ====================
module.exports = {
	// ビルドモード
	mode: BUILD_MODE,

	// Node.js環境向けビルド
	target: "node",
	externalsPresets: { node: true },
	externals: [nodeExternals()],

	// エントリーポイント
	entry: path.resolve(__dirname, "src", "index.ts"),

	// 出力設定
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "index.js",
		library: {
			type: "commonjs2",
		},
	},

	// ファイル解決
	resolve: {
		extensions: [".ts", ".js", ".json"],
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},

	// ローダー設定
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: {
					loader: "ts-loader",
					options: {
						transpileOnly: false, // 型チェック有効
						compilerOptions: {
							module: "esnext",
						},
					},
				},
				exclude: EXCLUDE_DIRS,
			},
		],
	},

	// 最適化設定
	optimization: {
		minimize: BUILD_MODE === "production",
		nodeEnv: BUILD_MODE,
	},

	// パフォーマンス警告
	performance: {
		hints: BUILD_MODE === "production" ? "warning" : false,
		maxEntrypointSize: 512000,
		maxAssetSize: 512000,
	},
};
