import { startServer } from "../../src/index";

let started = false;

export function ensureTestServer(port = Number(process.env.PORT || 3000)) {
	if (started) return;
	startServer(port);
	started = true;
}
