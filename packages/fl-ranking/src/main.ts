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

      <main id="mainContent" class="leaderboard-container fade-in" style="animation-delay: 0.1s">
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
            <span class="player-meta">${player.world} • ${player.dataCenter}</span>
          </div>
        </td>
        <td style="color: ${getGCColor(player.grandCompany)}">${player.grandCompany}</td>
        <td><span class="win-rate">${player.winRate}%</span></td>
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
      </div>
      <div class="stat-card">
        <label>K/D/A</label>
        <div class="stat-value">${player.kda}</div>
      </div>
      <div class="stat-card">
        <label>Avg. Damage</label>
        <div class="stat-value">${(player.avgDamage / 1000).toFixed(0)}k</div>
      </div>
      <div class="stat-card">
        <label>Battle High Avg</label>
        <div class="stat-value gold">${player.battleHighAvg}</div>
      </div>
    </div>

    <div class="chart-container fade-in" style="animation-delay: 0.2s">
      <h3>Recent Performance (Damage Done)</h3>
      <canvas id="performanceChart"></canvas>
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

renderApp();
