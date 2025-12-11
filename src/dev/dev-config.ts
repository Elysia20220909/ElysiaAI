/**
 * Personal Development Configuration
 * Hot reload, debug mode, development tools
 */

export type LogLevelType = 'debug' | 'info' | 'warn' | 'error';

export interface DevConfig {
	// Hot reload settings
	hotReload: boolean;
	watchPaths: string[];

	// Debug settings
	debug: boolean;
	logLevel: LogLevelType;
	verboseLogging: boolean;

	// Development path auto-generation
	devPaths: {
		testData: string;
		logs: string;
		cache: string;
	};

	// Database settings
	database: {
		autoReset: boolean;
		seedOnStart: boolean;
		debugSQL: boolean;
	};

	// Network settings
	network: {
		proxyLogging: boolean;
		networkSim: boolean;
		slowNetwork: boolean;
	};
}

const devConfig: DevConfig = {
  hotReload: process.env.HOT_RELOAD !== 'false',
  watchPaths: ['src', 'scripts', 'public'],

  debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development',
  logLevel: (process.env.LOG_LEVEL as unknown as LogLevelType) || 'info',
  verboseLogging: process.env.VERBOSE_LOG === 'true',

  devPaths: {
    testData: './dev/test-data',
    logs: './logs/dev',
    cache: './.dev-cache',
  },

  database: {
    autoReset: process.env.DB_AUTO_RESET === 'true',
    seedOnStart: process.env.DB_SEED_ON_START === 'true',
    debugSQL: process.env.DEBUG_SQL === 'true',
  },

  network: {
    proxyLogging: process.env.PROXY_LOGGING === 'true',
    networkSim: process.env.NETWORK_SIM === 'true',
    slowNetwork: process.env.SLOW_NETWORK === 'true',
  },
};

export default devConfig;
