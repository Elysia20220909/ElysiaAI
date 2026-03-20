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

type Route = "overview" | "trials" | "standings";

function getCurrentRoute(): Route {
	const hash = window.location.hash.replace("#", "");
	if (["overview", "trials", "standings"].includes(hash)) {
		return hash as Route;
	}
	return "overview";
}

async function renderApp() {
	app.innerHTML = `<div class="loading-screen">Loading Elysia FL Data...</div>`;

	const players = await dataService.getPlayers();
	const route = getCurrentRoute();

	app.innerHTML = `
    <div class="app-container">
      <nav class="navbar fade-in">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          FF14 <span>FL REPORT</span>
        </div>
        
        <div class="nav-links">
          <a href="#overview" class="nav-link ${route === "overview" ? "active" : ""}">Overview</a>
          <a href="#trials" class="nav-link ${route === "trials" ? "active" : ""}">Trials Report</a>
          <a href="#standings" class="nav-link ${route === "standings" ? "active" : ""}">Standings</a>
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

      <div class="route-content fade-in">
        ${renderRouteContent(route, players)}
      </div>

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
                  <option value="VPR">VPR</option><option value="PCT">PCT</option>
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
            <div class="form-row">
              <div class="form-group">
                <label>Assists</label>
                <input type="number" name="assists" value="0">
              </div>
              <div class="form-group">
                <label>Damage Taken</label>
                <input type="number" name="damageTaken" value="0">
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

function renderRouteContent(route: Route, players: PlayerStats[]) {
	if (route === "overview") {
		return `
      <div class="map-hero">
        <div class="map-overlay"></div>
        <div class="map-content">
          <div class="map-tag">ACTIVE SECTOR</div>
          <h1 class="map-name">ONSAL HAKAIR (DANSUIGEN)</h1>
          <p class="map-description">Strategic territory control with randomized high-value targets.</p>
          <div class="map-timer">Rerolls in: <span>14:25:03</span></div>
        </div>
      </div>
      <div class="battle-highlights">
        ${renderBattleHighlights(players)}
      </div>
      <div class="commanders-analysis">
        ${renderCommandersAnalysis(players)}
      </div>
      <div class="hall-of-fame">
        ${renderHallOfFame(players)}
      </div>
    `;
	}

	if (route === "trials") {
		return `
      <div class="trials-report-page">
        ${renderTrialsReport(players)}
        ${renderWeaponMeta()}
      </div>
    `;
	}

	if (route === "standings") {
		return `
      <main id="mainContent" class="dashboard-grid">
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
        </div>
      </main>
    `;
	}

	return "";
}

window.addEventListener("hashchange", renderApp);

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
			rank: Number.parseInt((fd.get("rank") as string) || "0", 10),
			winRate: Number.parseFloat((fd.get("winRate") as string) || "0"),
			avgDamage: Number.parseInt((fd.get("avgDamage") as string) || "0", 10),
			assists: Number.parseInt((fd.get("assists") as string) || "0", 10),
			damageTaken: Number.parseInt(
				(fd.get("damageTaken") as string) || "0",
				10,
			),
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

function renderBattleHighlights(players: PlayerStats[]) {
	const topDmg = [...players].sort(
		(a, b) => (b.avgDamage || 0) - (a.avgDamage || 0),
	)[0];
	const topHealing = [...players].sort(
		(a, b) => (b.avgHealing || 0) - (a.avgHealing || 0),
	)[0];
	const topAssists = [...players].sort(
		(a, b) => (b.assists || 0) - (a.assists || 0),
	)[0];
	const topTaken = [...players].sort(
		(a, b) => (b.damageTaken || 0) - (a.damageTaken || 0),
	)[0];

	return `
    <div class="highlight-container">
      <div class="highlight-card top-dps">
        <div class="highlight-icon">🔥</div>
        <div class="highlight-info">
          <label>TOP DAMAGE</label>
          <div class="highlight-player">${topDmg.name}</div>
          <div class="highlight-value">${(topDmg.avgDamage || 0).toLocaleString()}</div>
        </div>
      </div>
      <div class="highlight-card top-healer">
        <div class="highlight-icon">✨</div>
        <div class="highlight-info">
          <label>TOP HEALING</label>
          <div class="highlight-player">${topHealing.name}</div>
          <div class="highlight-value">${(topHealing.avgHealing || 0).toLocaleString()}</div>
        </div>
      </div>
      <div class="highlight-card top-assist">
        <div class="highlight-icon">🤝</div>
        <div class="highlight-info">
          <label>TOP ASSISTS</label>
          <div class="highlight-player">${topAssists.name}</div>
          <div class="highlight-value">${topAssists.assists || 0}</div>
        </div>
      </div>
      <div class="highlight-card top-tank">
        <div class="highlight-icon">🛡️</div>
        <div class="highlight-info">
          <label>IRON WALL</label>
          <div class="highlight-player">${topTaken.name}</div>
          <div class="highlight-value">${(topTaken.damageTaken || 0).toLocaleString()} <span class="sub">TAKEN</span></div>
        </div>
      </div>
    </div>
  `;
}

function renderWeaponMeta() {
	const jobStats = [
		{ job: "SMN", usage: "35%", winRate: "33.3%", kda: "10.24", popularity: 1 },
		{ job: "PLD", usage: "27%", winRate: "35.3%", kda: "9.07", popularity: 2 },
		{ job: "MCH", usage: "25%", winRate: "32.7%", kda: "7.94", popularity: 3 },
		{ job: "WAR", usage: "24%", winRate: "32.8%", kda: "5.58", popularity: 4 },
		{ job: "DRG", usage: "23%", winRate: "32.6%", kda: "7.93", popularity: 5 },
		{ job: "NIN", usage: "14%", winRate: "34.3%", kda: "10.01", popularity: 6 },
	];

	return `
    <div class="meta-section">
      <div class="meta-header">
        <h3>WEAPON META</h3>
        <span class="meta-trend-label">ONSAL HAKAIR // POPULARITY TREND</span>
      </div>
      <div class="meta-grid">
        ${jobStats
					.map(
						(s) => `
          <div class="meta-card">
            <div class="meta-rank-badge">0${s.popularity}</div>
            <div class="meta-icon-d2">${s.job}</div>
            <div class="meta-info">
              <div class="meta-job-name">${s.job}</div>
              <div class="meta-sub-label">USAGE: ${s.usage}</div>
            </div>
            <div class="meta-stats-row">
              <div class="m-stat">
                <span class="m-label">WIN %</span>
                <span class="m-value">${s.winRate}</span>
              </div>
              <div class="m-stat">
                <span class="m-label">KDA</span>
                <span class="m-value">${s.kda}</span>
              </div>
            </div>
          </div>
        `,
					)
					.join("")}
      </div>
    </div>
  `;
}

function renderHallOfFame(players: PlayerStats[]) {
	const excellencePlayers = players.filter((p) =>
		[
			"kelbi-ronso",
			"racoste-wanida",
			"gyawa-vatos",
			"shuty-neipia",
			"agnis-yuri",
			"kibi-dango",
		].includes(p.id),
	);

	const dmgWinner = excellencePlayers.find((p) => p.id === "kelbi-ronso");
	const healWinner = excellencePlayers.find((p) => p.id === "shuty-neipia");
	const stabilityWinner = excellencePlayers.find(
		(p) => p.id === "racoste-wanida",
	);

	return `
    <div class="hof-section">
      <h2 class="section-title">FRONTLINE EXCELLENCE</h2>
      <div class="hof-grid">
        <div class="hof-card gold">
          <div class="hof-tag">DESTRUCTION</div>
          <div class="hof-player">${dmgWinner?.name}</div>
          <div class="hof-stat">Avg DMG: <strong>${dmgWinner?.avgDamage?.toLocaleString()}</strong></div>
          <div class="hof-context">Top Tier Offensive SMN Performance</div>
        </div>
        <div class="hof-card gold">
          <div class="hof-tag">DEVOTION</div>
          <div class="hof-player">${healWinner?.name}</div>
          <div class="hof-stat">Avg HEAL: <strong>${healWinner?.avgHealing?.toLocaleString()}</strong></div>
          <div class="hof-context">Miraculous 4M Healing Record</div>
        </div>
        <div class="hof-card gold">
          <div class="hof-tag">LETHALITY</div>
          <div class="hof-player">${stabilityWinner?.name}</div>
          <div class="hof-stat">Avg Kills: <strong>7.18</strong></div>
          <div class="hof-context">Unrivaled Ninja Execution Skills</div>
        </div>
      </div>
    </div>
  `;
}

function renderCommandersAnalysis(players: PlayerStats[]) {
	const chloe = players.find((p) => p.id === "chloe-hestia");
	if (!chloe) return "";

	return `
    <div class="analysis-card">
      <div class="analysis-header">
        <div class="commander-icon">🎖️</div>
        <div>
          <h3>COMMANDER'S ANALYSIS</h3>
          <p>Strategic Performance Evaluation</p>
        </div>
      </div>
      <div class="analysis-content">
        <div class="analysis-summary">
          <div class="focus-stat">
            <label>STABILITY GRADE</label>
            <div class="grade">EX</div>
          </div>
          <div class="analysis-text">
            "Chloe's swordplay remains as calm as a still lake even in the midst of a raging battlefield. 
            With a <strong>KDA of 7.07</strong> over 350 matches, her ability to survive is legendary. 
            As a Ridill Samurai, she perfectly embodies 'stillness and motion'."
          </div>
        </div>
        <div class="analysis-metrics">
          <div class="metric">
            <label>Avg. Deaths</label>
            <div class="val">${chloe.deaths}</div>
          </div>
          <div class="metric">
            <label>Stability Class</label>
            <div class="val gold">HALL OF FAME</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTrialsReport(players: PlayerStats[]) {
	// Selection logic for featured categories
	const giants = [...players]
		.filter((p) => p.world !== "???") // Filter out any test data
		.sort((a, b) => (a.combatRating || 9.9) - (b.combatRating || 9.9))
		.slice(0, 3);

	const weapons = [...players]
		.sort((a, b) => (b.highestKills || 0) - (a.highestKills || 0))
		.slice(0, 3);

	const immortals = players
		.filter((p) => p.efficiency)
		.sort((a, b) => {
			const aVal =
				parseFloat((a.kda || "0").split(" / ")[0]) || parseFloat(a.kda || "0");
			const bVal =
				parseFloat((b.kda || "0").split(" / ")[0]) || parseFloat(b.kda || "0");
			return bVal - aVal;
		})
		.slice(0, 3);

	return `
    <div class="trials-container">
      <div class="trials-header">
        <div>
          <h2>FL TRIALS REPORT</h2>
          <div class="trials-subtitle">ONSAL HAKAIR // S-RANK SUMMARY</div>
        </div>
        <div class="trials-logo">💠</div>
      </div>
      
      <div class="trials-grid-main">
        <div class="trials-block">
          <h3>🎖️ THE ELO GIANTS</h3>
          <div class="trials-table-d2">
            ${giants
							.map(
								(p, i) => `
              <div class="player-card-d2">
                <div class="d2-rank">0${i + 1}</div>
                <div class="d2-info">
                  <span class="d2-name">${p.name} <span class="d2-job-tag">${p.job}</span></span>
                  <span class="d2-stat-label">${p.world} // ${p.grandCompany}</span>
                </div>
                <div class="d2-stats">
                  <div class="d2-stat-item">
                    <span class="d2-stat-label">WIN RATE</span>
                    <span class="d2-stat-value">${p.winRate}%</span>
                  </div>
                  <div class="d2-stat-item">
                    <span class="d2-stat-label">COMBAT RATING</span>
                    <span class="d2-stat-value">${p.combatRating}</span>
                  </div>
                </div>
              </div>
            `,
							)
							.join("")}
          </div>
        </div>

        <div class="trials-block">
          <h3>🔫 THE LETHAL WEAPONS</h3>
          <div class="trials-table-d2">
            ${weapons
							.map(
								(p, i) => `
              <div class="player-card-d2">
                <div class="d2-rank">0${i + 1}</div>
                <div class="d2-info">
                  <span class="d2-name">${p.name}</span>
                  <span class="d2-job-tag">${p.job}</span>
                </div>
                <div class="d2-stats">
                  <div class="d2-stat-item">
                    <span class="d2-stat-label">AVG KILLS</span>
                    <span class="d2-stat-value">${p.kda.split("/")[0].trim()}</span>
                  </div>
                  <div class="d2-stat-item">
                    <span class="d2-stat-label">HIGHEST</span>
                    <span class="d2-stat-value" style="color: #ff4d4d;">${p.highestKills}</span>
                  </div>
                </div>
              </div>
            `,
							)
							.join("")}
          </div>
        </div>

        <div class="trials-block">
          <h3>🛡️ THE IMMORTALS</h3>
          <div class="trials-table-d2">
            ${immortals
							.map(
								(p, i) => `
              <div class="player-card-d2">
                <div class="d2-rank">0${i + 1}</div>
                <div class="d2-info">
                  <span class="d2-name">${p.name}</span>
                  <span class="p-status-d2" style="color: ${p.efficiency === "UNTOUCHABLE" ? "var(--accent-trials)" : p.efficiency === "PHANTOM" ? "var(--accent-gold)" : "white"}">${p.efficiency}</span>
                </div>
                <div class="d2-stats">
                  <div class="d2-stat-item">
                    <span class="d2-stat-label">KDA RATIO</span>
                    <span class="d2-stat-value">${p.kda}</span>
                  </div>
                  <div class="d2-stat-item">
                    <span class="d2-stat-label">DEATHS AVG</span>
                    <span class="d2-stat-value">${p.deaths}</span>
                  </div>
                </div>
              </div>
            `,
							)
							.join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

renderApp();
