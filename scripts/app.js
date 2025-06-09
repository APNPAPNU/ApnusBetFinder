<script>
const SPORTS = ["all", "baseball", "basketball", "football", "soccer", "hockey", "golf"];
const API_BASE = "https://49pzwry2rc.execute-api.us-east-1.amazonaws.com/prod/getLiveGames?live=false";

let currentSport = "all";
let dataTable = null;

$(document).ready(() => {
  // Create filter buttons
  SPORTS.forEach(sport => {
    const label = sport === "all"
      ? "All Sports"
      : sport.charAt(0).toUpperCase() + sport.slice(1);
    const btn = $(`<button class="filter-btn" data-sport="${sport}">${label}</button>`);
    $(".button-bar").append(btn);
  });

  // Add refresh button
  const refreshBtn = $('<button id="refreshBtn" class="filter-btn">Refresh Data</button>');
  $(".button-bar").append(refreshBtn);

  // Activate “All” and fetch data
  $(".filter-btn[data-sport='all']").addClass("active");
  fetchAndDisplay("all");
});

$(document).on("click", ".filter-btn[data-sport]", function () {
  const chosen = $(this).data("sport");
  currentSport = chosen;
  $(".filter-btn").removeClass("active");
  $(this).addClass("active");
  fetchAndDisplay(chosen);
});

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
          game_name: game.game_name || "",
          game_date: game.game_date || "",
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

  // Destroy previous DataTable and clear the table
  if (dataTable) {
    dataTable.destroy();
    $("#betsTable").empty();
  }

  if (allRows.length === 0) {
    $("#betsTable").html("<tr><td>No data available.</td></tr>");
    return;
  }

  // Remove unwanted columns
  const columnsToRemove = [
    "game_id",
    "game_date",
    "game_name",
    "market_id",
    "market_type",
    "outcome_id",
    "has_alt",
    "event_name"
  ];

  const allCols = Object.keys(allRows[0]);
  const filteredCols = allCols.filter(col => !columnsToRemove.includes(col));

  const columns = filteredCols.map(col => ({
    title: col.replace(/_/g, " ").toUpperCase(),
    data: col
  }));

  const filteredRows = allRows.map(row => {
    const filteredRow = {};
    filteredCols.forEach(col => filteredRow[col] = row[col]);
    return filteredRow;
  });

  dataTable = $("#betsTable").DataTable({
    data: filteredRows,
    columns: columns,
    pageLength: 15,
    lengthMenu: [10, 15, 25, 50],
    order: [[1, "desc"]],
    language: {
      searchPlaceholder: "Search bets...",
      search: "",
      emptyTable: "No betting data found"
    },
    columnDefs: [{ targets: "_all", className: "dt-body-left" }]
  });
}
</script>
