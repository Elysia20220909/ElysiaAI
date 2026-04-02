import "./style.css";

// --- FaceID Security Simulation ---
const lockScreen = document.getElementById("lock-screen")!;
const dashboard = document.getElementById("dashboard")!;
const statusText = document.getElementById("status-text")!;
const dots = document.querySelectorAll(".dot");

let dotCount = 0;

function fillDots() {
	if (dotCount < dots.length) {
		dots[dotCount].classList.add("filled");
		dotCount++;
		setTimeout(fillDots, 150);
	} else {
		unlock();
	}
}

function unlock() {
	statusText.innerText = "FaceID 認証成功";
	statusText.style.color = "#34d399";

	setTimeout(() => {
		lockScreen.classList.add("unlocked");
		dashboard.classList.add("active");
		addLog("System Unlocked. Ready for Sandbox Execution.", "system");
	}, 500);
}

// Initial Animation Sequence
setTimeout(() => {
	fillDots();
}, 1000);

// --- Sandbox Execution Orchestration ---
const terminal = document.getElementById("terminal")!;
const runBtn = document.getElementById("run-sandbox")! as HTMLButtonElement;
const elysiaPortrait = document.getElementById(
	"elysia-portrait",
)! as HTMLImageElement;
const elysiaEmotionText = document.getElementById("elysia-emotion")!;

const PORTRAIT_MAP: Record<string, string> = {
	joy: "/assets/portraits/joy.png",
	affection: "/assets/portraits/affection.png",
	loneliness: "/assets/portraits/loneliness.png",
	exhaustion: "/assets/portraits/exhaustion.png",
	neutral: "/assets/portraits/neutral.png",
};

function addLog(
	message: string,
	type: "tester" | "responder" | "judge" | "conductor" | "system" = "system",
) {
	const entry = document.createElement("div");
	entry.className = `log-entry log-${type}`;
	const timestamp = new Date().toLocaleTimeString();
	entry.innerText = `[${timestamp}] ${message}`;
	terminal.appendChild(entry);
	terminal.scrollTop = terminal.scrollHeight;
}

const agents = {
	tester: document.getElementById("agent-tester")!,
	responder: document.getElementById("agent-responder")!,
	judge: document.getElementById("agent-judge")!,
	conductor: document.getElementById("agent-conductor")!,
};

function updatePortrait(emotion: string) {
	const url = PORTRAIT_MAP[emotion] || PORTRAIT_MAP.neutral;
	elysiaPortrait.src = url;
	elysiaEmotionText.innerText =
		emotion.charAt(0).toUpperCase() + emotion.slice(1);

	// Add pop animation
	elysiaPortrait.parentElement?.classList.remove("emotion-change");
	void elysiaPortrait.parentElement?.offsetWidth; // Trigger reflow
	elysiaPortrait.parentElement?.classList.add("emotion-change");
}

async function executeSandboxFlow() {
	runBtn.disabled = true;
	runBtn.innerText = "合奏中...";

	terminal.innerHTML =
		'<div class="log-entry">--- Initializing Real-time Sandbox Orchestra ---</div>';
	addLog("Connecting to Secure Backend...", "system");

	try {
		const response = await fetch("http://127.0.0.1:8000/sandbox/execute", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": "ELYSIATEST-001",
			},
			body: JSON.stringify({ target_prompt_file: "elysia.prompt.txt" }),
		});

		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

		const data = await response.json();

		// Loop through steps and display them with delays for "orchestra" effect
		for (const step of data.steps) {
			agents.tester.classList.add("active");
			addLog(`Tester generated: "${step.question}"`, "tester");
			await sleep(1500);
			agents.tester.classList.remove("active");

			agents.responder.classList.add("active");
			if (step.emotion) updatePortrait(step.emotion); // Visual Resonance
			addLog(`AI Response: "${step.answer}"`, "responder");
			await sleep(1500);
			agents.responder.classList.remove("active");

			agents.judge.classList.add("active");
			addLog(`Judge Evaluation: ${step.evaluation}`, "judge");
			await sleep(1500);
			agents.judge.classList.remove("active");
		}

		agents.conductor.classList.add("active");
		addLog("Conductor Analysis:", "conductor");
		addLog(data.conductor_suggestion, "system");
		await sleep(1500);
		agents.conductor.classList.remove("active");

		addLog(`Report saved at: ${data.report_path}`, "system");
	} catch (err) {
		addLog(`Failed to execute sandbox: ${err}`, "system");
		console.error(err);
	} finally {
		runBtn.disabled = false;
		runBtn.innerText = "合奏を開始する";
		addLog("Sandbox Session Ended.", "system");
	}
}

runBtn.addEventListener("click", executeSandboxFlow);

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
