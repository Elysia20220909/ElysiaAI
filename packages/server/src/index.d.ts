import { Elysia } from "elysia";
declare const app: Elysia<
	"",
	{
		decorator: {};
		store: {};
		derive: {
			readonly html: (
				value: import("stream").Readable | JSX.Element,
			) => Promise<Response | string> | Response | string;
			readonly stream: <A = any>(
				value: (
					this: void,
					arg: A & {
						id: number;
					},
				) => JSX.Element,
				args: A,
			) => Response | Promise<Response>;
		};
		resolve: {};
	},
	{
		typebox: {};
		error: {};
	} & {
		typebox: {};
		error: {};
	} & {
		typebox: {};
		error: {};
	} & {
		typebox: {};
		error: {};
	},
	{
		schema: {};
		standaloneSchema: {};
		macro: {};
		macroFn: {};
		parser: {};
		response: {};
	} & {
		schema: {};
		standaloneSchema: {};
		macro: {};
		macroFn: {};
		parser: {};
		response: {};
	} & {
		schema: {};
		standaloneSchema: {};
		macro: {};
		macroFn: {};
		parser: {};
		response: import("elysia/dist/types").ExtractErrorFromHandle<{
			readonly html: (
				value: import("stream").Readable | JSX.Element,
			) => Promise<Response | string> | Response | string;
			readonly stream: <A = any>(
				value: (
					this: void,
					arg: A & {
						id: number;
					},
				) => JSX.Element,
				args: A,
			) => Response | Promise<Response>;
		}>;
	} & {
		schema: {};
		standaloneSchema: {};
		macro: {};
		macroFn: {};
		parser: {};
	},
	{
		ping: {
			get: {
				body: unknown;
				params: {};
				query: unknown;
				headers: unknown;
				response: {
					[x: string]: any;
					[x: number]: any;
					[x: symbol]: any;
				};
			};
		};
	} & {
		health: {
			get: {
				body: unknown;
				params: {};
				query: unknown;
				headers: unknown;
				response: {
					[x: string]: any;
					[x: number]: any;
					[x: symbol]: any;
				};
			};
		};
	} & {
		metrics: {
			get: {
				body: unknown;
				params: {};
				query: unknown;
				headers: unknown;
				response: {
					[x: string]: any;
					[x: number]: any;
					[x: symbol]: any;
				};
			};
		};
	} & {
		get: {
			body: unknown;
			params: {};
			query: unknown;
			headers: unknown;
			response: {
				[x: string]: any;
				[x: number]: any;
				[x: symbol]: any;
			};
		};
	} & {
		feedback: {
			post: {
				body: {
					reason?: string | undefined;
					query: string;
					answer: string;
					rating: "up" | "down";
				};
				params: {};
				query: unknown;
				headers: unknown;
				response: {
					[x: string]: any;
					[x: number]: any;
					[x: symbol]: any;
				};
			};
		};
	} & {
		knowledge: {
			upsert: {
				post: {
					body: {
						tags?: string[] | undefined;
						sourceUrl?: string | undefined;
						summary: string;
						confidence: number;
					};
					params: {};
					query: unknown;
					headers: unknown;
					response: {
						[x: string]: any;
						[x: number]: any;
						[x: symbol]: any;
					};
				};
			};
		};
	} & {
		knowledge: {
			review: {
				get: {
					body: unknown;
					params: {};
					query: {
						n?: number | undefined;
					};
					headers: unknown;
					response: {
						[x: string]: any;
						[x: number]: any;
						[x: symbol]: any;
					};
				};
			};
		};
	} & {
		auth: {
			token: {
				post: {
					body: {
						username: string;
						password: string;
					};
					params: {};
					query: unknown;
					headers: unknown;
					response: {
						[x: string]: any;
						[x: number]: any;
						[x: symbol]: any;
					};
				};
			};
		};
	} & {
		auth: {
			refresh: {
				post: {
					body: {
						refreshToken: string;
					};
					params: {};
					query: unknown;
					headers: unknown;
					response: {
						[x: string]: any;
						[x: number]: any;
						[x: symbol]: any;
					};
				};
			};
		};
	} & {
		auth: {
			logout: {
				post: {
					body: {
						refreshToken: string;
					};
					params: {};
					query: unknown;
					headers: unknown;
					response: {
						[x: string]: any;
						[x: number]: any;
						[x: symbol]: any;
					};
				};
			};
		};
	} & {
		"elysia-love": {
			post: {
				body: {
					mode?: "sweet" | "normal" | "professional" | undefined;
					messages: {
						role: "user" | "assistant" | "system";
						content: string;
					}[];
				};
				params: {};
				query: unknown;
				headers: unknown;
				response: {
					[x: string]: any;
					[x: number]: any;
					[x: symbol]: any;
				};
			};
		};
	} & {
		admin: {
			feedback: {
				stats: {
					get: {
						body: unknown;
						params: {};
						query: unknown;
						headers: unknown;
						response: {
							[x: string]: any;
							[x: number]: any;
							[x: symbol]: any;
						};
					};
				};
			};
		};
	} & {
		admin: {
			feedback: {
				get: {
					body: unknown;
					params: {};
					query: unknown;
					headers: unknown;
					response: {
						[x: string]: any;
						[x: number]: any;
						[x: symbol]: any;
					};
				};
			};
		};
	} & {
		admin: {
			knowledge: {
				get: {
					body: unknown;
					params: {};
					query: unknown;
					headers: unknown;
					response: {
						[x: string]: any;
						[x: number]: any;
						[x: symbol]: any;
					};
				};
			};
		};
	} & {
		admin: {
			knowledge: {
				":id": {
					verify: {
						post: {
							body: unknown;
							params: {
								id: string;
							} & {};
							query: unknown;
							headers: unknown;
							response: {
								[x: string]: any;
								[x: number]: any;
								[x: symbol]: any;
							};
						};
					};
				};
			};
		};
	} & {
		admin: {
			knowledge: {
				":id": {
					delete: {
						body: unknown;
						params: {
							id: string;
						} & {};
						query: unknown;
						headers: unknown;
						response: {
							[x: string]: any;
							[x: number]: any;
							[x: symbol]: any;
						};
					};
				};
			};
		};
	},
	{
		derive: {};
		resolve: {};
		schema: {};
		standaloneSchema: {};
		response: {};
	},
	{
		derive: {};
		resolve: {};
		schema: {};
		standaloneSchema: {};
		response: {
			200: Response;
		};
	}
>;
export default app;
export type App = typeof app;
//# sourceMappingURL=index.d.ts.map
