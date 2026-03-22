export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	missing: string[];
	invalid: string[];
}
export declare function validateEnvironment(): ValidationResult;
export declare function checkEnvironmentOrExit(): void;
export declare function printEnvironmentSummary(): void;
//# sourceMappingURL=env-validator.d.ts.map
