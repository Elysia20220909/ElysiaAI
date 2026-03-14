import "./style.css";
import type { PlayerStats } from "./data/mockData";
import { mockPlayers } from "./data/mockData";

const app = document.querySelector("#app") as HTMLDivElement;

import Chart from "chart.js/auto";

function getGCColor(gc: string) {
	if (gc === "Maelstrom") return "#da3200";
	if (gc === "Twin Adder") return "#96ba3c";
	if (gc === "Immortal Flames") return "#0070da";
	return "#fff";
}

function renderApp() {
	app.innerHTML = `
    <div class="app-container">
      <nav class="navbar fade-in">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          FF14 <span>FL REPORT</span>
        </div>
        <div class="search-container">
          <input type="text" id="playerSearch" class="search-input" placeholder="Search Player, World, or Grand Company...">
          <svg style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #9ea4b0;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
      </nav>

      <div class="map-hero fade-in">
        <div class="map-overlay"></div>
        <div class="map-content">
          <div class="map-tag">ACTIVE SECTOR</div>
          <h1 class="map-name">ONSAL HAKAIR (DANSUIGEN)</h1>
          <p class="map-description">Strategic territory control with randomized high-value targets. Engage the Au Ra tribes and secure the Ovoos.</p>
          <div class="map-timer">Rerolls in: <span>14:25:03</span></div>
        </div>
      </div>

      <main id="mainContent" class="dashboard-grid fade-in" style="animation-delay: 0.1s">
        <div class="side-panel">
            <div class="glass-card meta-card">
              <h3>Job Meta Analysis</h3>
              <div class="meta-list">
                ${renderJobMeta(mockPlayers)}
              </div>
            </div>
        </div>

        <div class="main-panel">
            <div class="glass-card">
              <div class="leaderboard-header">
                <h2>Season Standings</h2>
                <div class="player-meta">Top 100 Players • Updated Live</div>
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
                  <th>MATCHES</th>
                </tr>
              </thead>
              <tbody id="leaderboardBody">
                ${renderLeaderboard(mockPlayers)}
              </tbody>
            </table>
          </div>

          <div id="playerProfileView" style="display: none;">
            <!-- Profile content will be injected here -->
          </div>
        </div>
      </main>
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
        <td>
            <div class="win-rate-container">
                <span class="win-rate">${player.winRate}%</span>
                <div class="streak-dots">${renderStreak(player.lastMatches.map(m => m.result))}</div>
            </div>
        </td>
        <td>${player.kda}</td>
        <td>${(player.avgDamage / 1000).toFixed(1)}k</td>
        <td>${player.totalMatches}</td>
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
	const searchContainer = document.querySelector(
		".search-container",
	) as HTMLDivElement;

	searchContainer.style.display = "none";
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
        <label>Lifetime Win Rate</label>
        <div class="stat-value blue">${player.winRate}%</div>
        <div class="stat-sub">Top Tier Performance</div>
      </div>
      <div class="stat-card">
        <label>K/D/A Ratio</label>
        <div class="stat-value">${player.kda}</div>
        <div class="stat-sub">High Frag Capability</div>
      </div>
      <div class="stat-card">
        <label>Avg. Damage</label>
        <div class="stat-value">${(player.avgDamage / 1000).toFixed(0)}k</div>
        <div class="stat-sub">Team Carry Lead</div>
      </div>
      <div class="stat-card">
        <label>Battle High Avg</label>
        <div class="stat-value gold">${player.battleHighAvg}</div>
        <div class="stat-sub">Rank S Dominance</div>
      </div>
    </div>

    <div class="profile-content-grid fade-in" style="animation-delay: 0.2s">
        <div class="chart-section glass-card">
          <h3>Damage Output Trends</h3>
          <canvas id="performanceChart"></canvas>
        </div>

        <div class="history-section glass-card">
          <h3>Recent Match History</h3>
          <div class="match-list">
            ${player.lastMatches
							.map(
								(m) => `
                <div class="match-item ${m.result.toLowerCase()}">
                    <div class="match-main">
                        <span class="match-result-tag">${m.result}</span>
                        <span class="match-time">${m.time}</span>
                    </div>
                    <div class="match-stats">
                        <span class="m-stat">K <strong>${m.kills}</strong></span>
                        <span class="m-stat">D <strong>${m.deaths}</strong></span>
                        <span class="m-stat">A <strong>${m.assists}</strong></span>
                        <span class="m-dmg">${(m.damage / 1000).toFixed(0)}k Damage</span>
                    </div>
                </div>
            `,
							)
							.join("")}
          </div>
        </div>
    </div>
  `;

	renderChart(player);

	(document.querySelector("#backButton") as HTMLElement).addEventListener(
		"click",
		() => {
			profileView.style.display = "none";
			leaderboardView.style.display = "block";
			searchContainer.style.display = "block";
		},
	);
}

function renderChart(player: PlayerStats) {
	const ctx = (
		document.getElementById("performanceChart") as HTMLCanvasElement
	).getContext("2d") as CanvasRenderingContext2D;

	new Chart(ctx, {
		type: "line",
		data: {
			labels: player.lastMatches.map((_, i) => `Match ${i + 1}`).reverse(),
			datasets: [
				{
					label: "Damage Output",
					data: player.lastMatches.map((m) => m.damage).reverse(),
					borderColor: "#0070da",
					backgroundColor: "rgba(0, 112, 218, 0.1)",
					fill: true,
					tension: 0.4,
				},
			],
		},
		options: {
			responsive: true,
			plugins: {
				legend: { display: false },
			},
			scales: {
				y: {
					grid: { color: "rgba(255,255,255,0.05)" },
					ticks: { color: "#9ea4b0" },
				},
				x: { grid: { display: false }, ticks: { color: "#9ea4b0" } },
			},
		},
	});
}

function setupEventListeners() {
	const searchInput = document.getElementById(
		"playerSearch",
	) as HTMLInputElement;
	const leaderboardBody = document.getElementById(
		"leaderboardBody",
	) as HTMLTableSectionElement;

	searchInput.addEventListener("input", (e) => {
		const term = (e.target as HTMLInputElement).value.toLowerCase();
		const filtered = mockPlayers.filter(
			(p) =>
				p.name.toLowerCase().includes(term) ||
				p.world.toLowerCase().includes(term) ||
				p.grandCompany.toLowerCase().includes(term),
		);
		leaderboardBody.innerHTML = renderLeaderboard(filtered);
		attachRowListeners();
	});

	attachRowListeners();
}

function attachRowListeners() {
	document.querySelectorAll(".clickable-row").forEach((row) => {
		row.addEventListener("click", () => {
			const id = (row as HTMLElement).dataset.id;
			const player = mockPlayers.find((p) => p.id === id);
			if (player) showPlayerProfile(player);
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
			return `
            <div class="meta-item">
                <div class="meta-info">
                    <span class="meta-job">${job}</span>
                    <span class="meta-count">${percentage}%</span>
                </div>
                <div class="meta-bar-bg">
                    <div class="meta-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
		})
		.join("");
}

function renderStreak(results: ("Win" | "Loss" | "Draw")[]) {
	return results
		.slice(0, 5)
		.map(
			(r) => `<span class="streak-dot ${r.toLowerCase()}" title="${r}"></span>`,
		)
		.join("");
}

renderApp();
