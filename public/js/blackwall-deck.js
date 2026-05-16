const $ = (id) => document.getElementById(id);

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...options,
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || response.statusText, status: response.status };
  }
}

function summarizeTrace(trace) {
  if (!trace?.events?.length) return "No trace events available or operator auth required.";
  return trace.events.slice(0, 8).map((event) => {
    return `[${event.time}] ${event.event} risk=${event.risk ?? "-"} action=${event.action ?? "-"}`;
  }).join("\n");
}

async function refreshDeck() {
  const status = await getJson("/api/blackwall/status");
  const blackoutMode = Boolean(status.blackoutMode);
  const ghostTickets = status.ghostRoom?.activeTickets ?? 0;

  $("runtime-status").textContent = status.status || "UNKNOWN";
  $("runtime-id").textContent = `runtime: ${status.runtimeId || "--"}`;
  $("blackout-mode").textContent = blackoutMode ? "ACTIVE" : "CLEAR";
  $("ghost-room-count").textContent = `${ghostTickets} tickets`;

  const forecast = await getJson("/api/blackwall/singularity/forecast", {
    method: "POST",
    body: JSON.stringify({
      traceChainOk: true,
      blackoutMode,
      ghostRoomTickets: ghostTickets,
      highRiskEvents: 0,
      operatorPresent: false,
      lastDecisionRisk: 0,
    }),
  });

  $("singularity-posture").textContent = forecast.posture || "--";
  $("singularity-recommendation").textContent = `recommendation: ${forecast.recommendation || "--"}`;
  $("forecast-output").textContent = JSON.stringify(forecast, null, 2);

  const trace = await getJson("/api/blackwall/trace?limit=12");
  $("trace-output").textContent = summarizeTrace(trace);
}

$("refresh-button")?.addEventListener("click", refreshDeck);
refreshDeck().catch((error) => {
  $("runtime-status").textContent = "OFFLINE";
  $("trace-output").textContent = error instanceof Error ? error.message : String(error);
});
