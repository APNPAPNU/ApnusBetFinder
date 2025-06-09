// scripts/app.js

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const SPORTS = ["all", "baseball", "basketball", "football", "soccer", "hockey", "golf"];
const API_BASE = "https://49pzwry2rc.execute-api.us-east-1.amazonaws.com/prod/getLiveGames?live=false";

let dataTable = null;
let currentSport = "all";  // we'll keep track of which sport is active

// ─── DOCUMENT READY: build sport buttons + refresh button and load default ────
$(document).ready(() => {
  // 1) Build sport filter buttons
  SPORTS.forEach(sport => {
    const label = sport === "all"
      ? "All Sports"
      : sport.charAt(0).toUpperCase() + sport.slice(1);
    const btn = $(`<button class="filter-btn" data-sport="${sport}">${label}</button>`);
    $(".button-bar").append(btn);
  });

  // 2) Add a Refresh button at the end
  const refreshBtn = $(`<button id="refreshBtn" style="margin-left: 12px; background:#f39c12; color:white; border:none; padding:10px 18px; border-radius:25px; cursor:pointer;">Refresh</button>`);
  $(".button-bar").append(refreshBtn);

  // 3) Activate “All” and fetch combined data on page load
  $(".filter-btn[data-sport='all']").addClass("active");
  fetchAndDisplay("all");

  // 4) Auto-refresh every 60 seconds
  setInterval(() => {
    fetchAndDisplay(currentSport);
  }, 60000); // 60000 ms = 60s
});

// ─── HANDLE SPORT BUTTON CLICKS ────────────────────────────────────────────────
$(document).on("click", ".filter-btn", function() {
  const chosen = $(this).data("sport");
  currentSport = chosen;                  // update global
  $(".filter-btn").removeClass("active");
  $(this).addClass("active");
  fetchAndDisplay(chosen);
});

// ─── HANDLE REFRESH BUTTON ─────────────────────────────────────────────────────
$(document).on("click", "#refreshBtn", () => {
  fetchAndDisplay(currentSport);
});

// ─── CORE: fetchAndDisplay(sport) ──────────────────────────────────────────────
async function fetchAndDisplay(sport) {
  // Show a quick “Loading…” message while we fetch
  if (dataTable) {
    dataTable.destroy();
    $("#betsTable").empty();
  }
  $("#betsTable").html("<tr><td>Loading data…</td></tr>");

  // Determine which endpoints to hit (all => every sport except "all")
  const toFetch = (sport === "all")
    ? SPORTS.filter(s => s !== "all")
    : [sport];

  const allRows = [];

  for (const sp of toFetch) {
    const url = `${API_BASE}&sport=${sp}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error(`Failed to fetch ${sp}: HTTP ${resp.status}`);
        continue;
      }
      const json = await resp.json();
      const body = json.body || {};

      // Flatten nested JSON into row objects
      Object.values(body).forEach(game => {
        const game_base = {
          game_id: game.game_id || "",
          game_date: game.game_date || "",
          game_name: game.game_name || "",
          sport: game.sport || sp,
          league: game.league || "",
          home_team: game.home_team || "",
          away_team: game.away_team || "",
          player_1: game.player_1 || "",
          player_2: game.player_2 || "",
          event_name: game.event_name || "",
          player_names: game.player_names || ""
        };
        const markets = game.markets || {};
        Object.values(markets).forEach(market => {
          const market_base = {
            market_id: market.market_id || "",
            market_type: market.market_type || "",
            market_display_name: market.display_name || ""
          };
          const outcomes = market.outcomes || {};
          Object.values(outcomes).forEach(outcome => {
            const best_odd = outcome.best_odd || {};
            const book_key = Object.keys(best_odd)[0] || "";
            const odd_details = book_key ? (best_odd[book_key][0] || {}) : {};

            allRows.push({
              ...game_base,
              ...market_base,
              outcome_id: outcome.outcome_id || "",
              outcome_type: outcome.outcome_type || "",
              outcome_display_name: outcome.display_name || "",
              has_alt: outcome.has_alt || false,
              odd_timestamp: odd_details.timestamp || "",
              spread: odd_details.spread || 0,
              american_odds: odd_details.american_odds || 0,
              book: odd_details.book || ""
            });
          });
        });
      });
    } catch (err) {
      console.error(`Error fetching ${sp}:`, err);
    }
  }

  // Destroy previous table if exists
  if (dataTable) {
    dataTable.destroy();
    $("#betsTable").empty();
  }

  // If no rows, show “No data available.”
  if (allRows.length === 0) {
    $("#betsTable").html("<tr><td>No data available.</td></tr>");
    return;
  }

  // Build columns dynamically from keys of the first row
  const columns = Object.keys(allRows[0]).map(col => ({
    title: col.replace(/_/g, " ").toUpperCase(),
    data: col
  }));

  // Initialize DataTable
  dataTable = $("#betsTable").DataTable({
    data: allRows,
    columns: columns,
    pageLength: 15,
    lengthMenu: [10, 15, 25, 50],
    order: [[1, "desc"]], // sort by game_date descending
    language: {
      searchPlaceholder: "Search bets...",
      search: "",
      emptyTable: "No betting data found"
    },
    columnDefs: [{ targets: "_all", className: "dt-body-left" }]
  });
}
