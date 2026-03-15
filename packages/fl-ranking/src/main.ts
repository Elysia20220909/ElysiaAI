import "./style.css";
import type { PlayerStats } from "./data/mockData";
import { LocalStorageDataService } from "./dataService.ts";

const app = document.querySelector("#app") as HTMLDivElement;
const dataService = new LocalStorageDataService();

function getGCColor(gc: string) {
	if (gc === "Maelstrom") return "#da3200";
	if (gc === "Twin Adder") return "#96ba3c";
	if (gc === "Immortal Flames") return "#0070da";
	return "#fff";
}

async function renderApp() {
	app.innerHTML = `<div class="loading-screen">Loading Elysia FL Data...</div>`;

	const players = await dataService.getPlayers();

	app.innerHTML = `
    <div class="app-container">
      <nav class="navbar fade-in">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          FF14 <span>FL REPORT</span>
        </div>
        <div class="nav-actions">
          <div class="search-container">
            <input type="text" id="playerSearch" class="search-input" placeholder="Search Player...">
            <svg style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #9ea4b0;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <button id="addPlayerBtn" class="primary-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Entry
          </button>
        </div>
      </nav>

      <div class="map-hero fade-in">
        <div class="map-overlay"></div>
        <div class="map-content">
          <div class="map-tag">ACTIVE SECTOR</div>
          <h1 class="map-name">ONSAL HAKAIR (DANSUIGEN)</h1>
          <p class="map-description">Strategic territory control with randomized high-value targets.</p>
          <div class="map-timer">Rerolls in: <span>14:25:03</span></div>
        </div>
      </div>

      <main id="mainContent" class="dashboard-grid fade-in" style="animation-delay: 0.1s">
        <div class="side-panel">
            <div class="glass-card meta-card">
              <h3>Job Meta Analysis</h3>
              <div class="meta-list">
                ${renderJobMeta(players)}
              </div>
            </div>
        </div>

        <div class="main-panel">
            <div class="glass-card">
              <div class="leaderboard-header">
                <h2>Season Standings</h2>
                <div class="player-meta">Manual Entry Mode • Local Storage</div>
              </div>
              
              <div id="leaderboardView" class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>PLAYER</th>
                  <th>GC</th>
                  <th>WIN RATE</th>
                  <th>KDA</th>
                  <th>AVG DMG</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody id="leaderboardBody">
                ${renderLeaderboard(players)}
              </tbody>
            </table>
          </div>

          <div id="playerProfileView" style="display: none;"></div>
        </div>
      </main>

      <div id="modalOverlay" class="modal-overlay" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Add New Entry</h3>
            <button id="closeModal" class="icon-btn"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
          </div>
          <form id="playerForm" class="entry-form">
            <div class="form-row">
              <div class="form-group">
                <label>Player Name</label>
                <input type="text" name="name" required placeholder="Name Surname">
              </div>
              <div class="form-group">
                <label>Job</label>
                <select name="job" required>
                  <option value="PLD">PLD</option><option value="WAR">WAR</option><option value="DRK">DRK</option><option value="GNB">GNB</option>
                  <option value="WHM">WHM</option><option value="SCH">SCH</option><option value="AST">AST</option><option value="SGE">SGE</option>
                  <option value="MNK">MNK</option><option value="DRG">DRG</option><option value="NIN">NIN</option><option value="SAM">SAM</option><option value="RPR">RPR</option>
                  <option value="BRD">BRD</option><option value="MCH">MCH</option><option value="DNC">DNC</option><option value="BLM">BLM</option><option value="SMN">SMN</option><option value="RDM">RDM</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>World</label>
                <input type="text" name="world" required placeholder="Bahamut">
              </div>
              <div class="form-group">
                <label>Data Center</label>
                <input type="text" name="dataCenter" required placeholder="Gaia">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Grand Company</label>
                <select name="grandCompany" required>
                  <option value="Maelstrom">Maelstrom</option>
                  <option value="Twin Adder">Twin Adder</option>
                  <option value="Immortal Flames">Immortal Flames</option>
                </select>
              </div>
              <div class="form-group">
                <label>Rank</label>
                <input type="number" name="rank" required min="1" max="100">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Win Rate (%)</label>
                <input type="number" name="winRate" step="0.1" required>
              </div>
              <div class="form-group">
                <label>Avg Damage</label>
                <input type="number" name="avgDamage" required>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="primary-btn wide">Save Record</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

	setupEventListeners();
}

function renderLeaderboard(players: PlayerStats[]) {
	return players
		.sort((a, b) => a.rank - b.rank)
		.map(
			(player) => `
      <tr class="rank-${player.rank} clickable-row" data-id="${player.id}">
        <td><div class="rank-badge">${player.rank}</div></td>
        <td>
          <div class="player-info">
            <span class="player-name">${player.name}</span>
            <span class="player-job">${player.job}</span>
            <span class="player-meta">${player.world} • ${player.dataCenter}</span>
          </div>
        </td>
        <td style="color: ${getGCColor(player.grandCompany)}">${player.grandCompany}</td>
        <td><span class="win-rate">${player.winRate}%</span></td>
        <td>${player.kda || "N/A"}</td>
        <td>${((player.avgDamage || 0) / 1000).toFixed(1)}k</td>
        <td>
          <button class="delete-btn icon-btn" data-id="${player.id}" title="Delete Record">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      </tr>
    `,
		)
		.join("");
}

function showPlayerProfile(player: PlayerStats) {
	const leaderboardView = document.getElementById(
		"leaderboardView",
	) as HTMLDivElement;
	const profileView = document.getElementById(
		"playerProfileView",
	) as HTMLDivElement;
	const navActions = document.querySelector(".nav-actions") as HTMLDivElement;

	navActions.style.display = "none";
	leaderboardView.style.display = "none";
	profileView.style.display = "block";

	profileView.innerHTML = `
    <div class="profile-header fade-in">
      <button id="backButton" class="back-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back to Leaderboard
      </button>
      <div class="profile-title">
        <div class="rank-badge large">${player.rank}</div>
        <div>
          <h1>${player.name}</h1>
          <p>${player.world} • ${player.dataCenter} • ${player.grandCompany}</p>
        </div>
      </div>
    </div>
    <div class="stats-grid fade-in" style="animation-delay: 0.1s">
      <div class="stat-card">
        <label>Win Rate</label>
        <div class="stat-value blue">${player.winRate}%</div>
      </div>
      <div class="stat-card">
        <label>Avg. Damage</label>
        <div class="stat-value">${((player.avgDamage || 0) / 1000).toFixed(0)}k</div>
      </div>
      <div class="stat-card">
        <label>Job</label>
        <div class="stat-value gold">${player.job}</div>
      </div>
    </div>
  `;

	(document.querySelector("#backButton") as HTMLElement).addEventListener(
		"click",
		() => {
			profileView.style.display = "none";
			leaderboardView.style.display = "block";
			navActions.style.display = "flex";
		},
	);
}

function setupEventListeners() {
	const searchInput = document.getElementById(
		"playerSearch",
	) as HTMLInputElement;
	const leaderboardBody = document.getElementById(
		"leaderboardBody",
	) as HTMLTableSectionElement;
	const addBtn = document.getElementById("addPlayerBtn");
	const overlay = document.getElementById("modalOverlay");
	const closeBtn = document.getElementById("closeModal");
	const form = document.getElementById("playerForm") as HTMLFormElement;

	searchInput.addEventListener("input", async (e) => {
		const term = (e.target as HTMLInputElement).value;
		const filtered = await dataService.searchPlayers(term);
		leaderboardBody.innerHTML = renderLeaderboard(filtered);
		attachRowListeners(filtered);
	});

	if (addBtn)
		addBtn.addEventListener("click", () => {
			if (overlay) overlay.style.display = "flex";
		});
	if (closeBtn)
		closeBtn.addEventListener("click", () => {
			if (overlay) overlay.style.display = "none";
		});
	if (overlay)
		overlay.addEventListener("click", (e) => {
			if (e.target === overlay) overlay.style.display = "none";
		});

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const fd = new FormData(form);
		const newPlayer: PlayerStats = {
			id: Date.now().toString(),
			name: (fd.get("name") as string) || "Unknown",
			world: (fd.get("world") as string) || "Unknown",
			dataCenter: (fd.get("dataCenter") as string) || "Unknown",
			// biome-ignore lint/suspicious/noExplicitAny: cast to match type
			grandCompany: (fd.get("grandCompany") as string as any) || "Maelstrom",
			// biome-ignore lint/suspicious/noExplicitAny: cast to match type
			job: (fd.get("job") as string as any) || "PLD",
			rank: parseInt((fd.get("rank") as string) || "0", 10),
			winRate: parseFloat((fd.get("winRate") as string) || "0"),
			avgDamage: parseInt((fd.get("avgDamage") as string) || "0", 10),
			totalMatches: 0,
			kda: "0.0 / 0.0 / 0.0",
			avgHealing: 0,
			battleHighAvg: 0,
			lastMatches: [],
		};
		await dataService.addPlayer(newPlayer);
		form.reset();
		if (overlay) overlay.style.display = "none";
		renderApp();
	});

	dataService.getPlayers().then((players) => attachRowListeners(players));
}

function attachRowListeners(players: PlayerStats[]) {
	document.querySelectorAll(".clickable-row").forEach((row) => {
		row.addEventListener("click", (e) => {
			if ((e.target as HTMLElement).closest(".delete-btn")) return;
			const id = (row as HTMLElement).dataset.id;
			const player = players.find((p) => p.id === id);
			if (player) showPlayerProfile(player);
		});
	});

	document.querySelectorAll(".delete-btn").forEach((btn) => {
		btn.addEventListener("click", async () => {
			const id = (btn as HTMLElement).dataset.id || "";
			if (confirm("Delete this record?")) {
				await dataService.deletePlayer(id);
				renderApp();
			}
		});
	});
}

function renderJobMeta(players: PlayerStats[]) {
	const jobCounts: Record<string, number> = {};
	for (const p of players) {
		jobCounts[p.job] = (jobCounts[p.job] || 0) + 1;
	}
	return Object.entries(jobCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 5)
		.map(([job, count]) => {
			const percentage = Math.round((count / players.length) * 100);
			return `<div class="meta-item"><div class="meta-info"><span class="meta-job">${job}</span><span class="meta-count">${percentage}%</span></div><div class="meta-bar-bg"><div class="meta-bar-fill" style="width: ${percentage}%"></div></div></div>`;
		})
		.join("");
}

renderApp();
