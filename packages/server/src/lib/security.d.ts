export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function createUser(
	username: string,
	password: string,
	role?: string,
): Promise<{
	id: string;
	username: string;
	role: string;
	createdAt: Date;
	passwordHash: string;
	updatedAt: Date;
}>;
export declare function authenticateUser(
	username: string,
	password: string,
): Promise<{
	success: boolean;
	user?: unknown;
	error?: string;
}>;
export declare function changePassword(
	userId: string,
	oldPassword: string,
	newPassword: string,
): Promise<{
	success: boolean;
	error?: string;
}>;
//# sourceMappingURL=security.d.ts.map
