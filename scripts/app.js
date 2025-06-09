const SPORTS = ["all", "baseball", "basketball", "football", "soccer", "hockey", "golf"];
const API_BASE = "https://49pzwry2rc.execute-api.us-east-1.amazonaws.com/prod/getLiveGames?live=false";

let currentSport = "all";
let dataTable = null;

$(document).ready(() => {
  // Create sport filter buttons
  SPORTS.forEach(sport => {
    const label = sport === "all" ? "All Sports" : sport.charAt(0).toUpperCase() + sport.slice(1);
    const btn = $(`<button class="filter-btn" data-sport="${sport}">${label}</button>`);
    $(".button-bar").prepend(btn); // Prepend to ensure Refresh stays on the end
  });

  // Activate 'all' by default
  $(".filter-btn[data-sport='all']").addClass("active");
  fetchAndDisplay("all");
});

// Handle filter buttons
$(document).on("click", ".filter-btn[data-sport]", function () {
  const chosen = $(this).data("sport");
  currentSport = chosen;
  $(".filter-btn").removeClass("active");
  $(this).addClass("active");
  fetchAndDisplay(chosen);
});

// Handle refresh
$(document).on("click", "#refreshBtn", function () {
  fetchAndDisplay(currentSport);
});

async function fetchAndDisplay(sport) {
  const toFetch = (sport === "all") ? SPORTS.filter(s => s !== "all") : [sport];
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

      Object.values(body).forEach(game => {
        const game_base = {
          game_id: game.game_id || "",
          game_date: game.game_date || "",
          game_name: game.game_name || "",
          sport: game.sport || sp,
          league: game.league || "",
          home_team: game.home_team || "",
          away_team: game.away_team || "",
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
              book: odd_details.book || "",
              spread: odd_details.spread || "",
              american_odds: odd_details.american_odds || "",
              odd_timestamp: odd_details.timestamp || ""
            });
          });
        });
      });
    } catch (err) {
      console.error(`Error fetching ${sp}:`, err);
    }
  }

  // Reset DataTable
  if (dataTable) {
    dataTable.destroy();
    $("#betsTable").empty();
  }

  if (allRows.length === 0) {
    $("#betsTable").html("<tr><td>No data available.</td></tr>");
    return;
  }

  // Show these columns
  const showColumns = [
    "game_date", "game_name", "sport", "league",
    "home_team", "away_team", "market_type", "market_display_name",
    "outcome_type", "outcome_display_name", "american_odds", "spread", "book", "odd_timestamp"
  ];

  const columns = showColumns.map(col => ({
    title: col.replace(/_/g, " ").toUpperCase(),
    data: col
  }));

  const filteredRows = allRows.map(row => {
    const obj = {};
    showColumns.forEach(col => obj[col] = row[col]);
    return obj;
  });

  dataTable = $("#betsTable").DataTable({
    data: filteredRows,
    columns: columns,
    pageLength: 15,
    lengthMenu: [10, 15, 25, 50],
    order: [[0, "desc"]],
    language: {
      searchPlaceholder: "Search bets...",
      search: "",
      emptyTable: "No betting data found"
    },
    columnDefs: [{ targets: "_all", className: "dt-body-left" }]
  });
}
