const SPORTS = ["all", "baseball", "basketball", "football", "soccer", "hockey", "golf"];
const API_BASE = "https://49pzwry2rc.execute-api.us-east-1.amazonaws.com/prod/getLiveGames?live=false";

let currentSport = null;  // No sport selected initially
let dataTable = null;

$(document).ready(() => {
  // Add buttons dynamically on page load
  SPORTS.forEach(sport => {
    const label = sport === "all" ? "All Sports" : sport.charAt(0).toUpperCase() + sport.slice(1);
    const btn = $(`<button class="filter-btn" data-sport="${sport}">${label}</button>`);
    $(".button-bar").append(btn);
  });

  // Add Refresh button at the end
  const refreshBtn = $('<button id="refreshBtn">Refresh</button>');
  $(".button-bar").append(refreshBtn);
});

// When user clicks a sport button
$(document).on("click", ".filter-btn[data-sport]", function () {
  const chosen = $(this).data("sport");

  if (currentSport === chosen) {
    // If same button clicked again, do nothing
    return;
  }

  currentSport = chosen;
  $(".filter-btn").removeClass("active");
  $(this).addClass("active");

  fetchAndDisplay(currentSport);
});

// Refresh button reloads data for current sport if any selected
$(document).on("click", "#refreshBtn", () => {
  if (currentSport) {
    fetchAndDisplay(currentSport);
  } else {
    alert("Please select a sport first.");
  }
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

  if (dataTable) {
    dataTable.destroy();
    $("#betsTable").empty();
  }

  if (allRows.length === 0) {
    $("#betsTable").html("<tr><td>No data available.</td></tr>");
    return;
  }

  // Columns to exclude from display
  const columnsToRemove = [
    "market_type",
    "odd_timestamp",
    "sport",
    "game_date",
    "game_id",  // Keep game_id in data but don't display it
    "market_id",
    "outcome_id",
    "has_alt",
    "event_name",
    "game_name",
    "player_1",
    "player_2",
    "player_names",
    "outcome_display_name"
  ];

  // Get all keys in first row
  const allCols = Object.keys(allRows[0]);

  // Filter columns, removing the ones above
  const filteredCols = allCols.filter(col => !columnsToRemove.includes(col));

  // Build columns array for DataTables
  const columns = filteredCols.map(col => ({
    title: col.replace(/_/g, " ").toUpperCase(),
    data: col
  }));

  // Filter each row to only include desired columns (but keep game_id in the original data)
  const filteredRows = allRows.map(row => {
    const filteredRow = {};
    filteredCols.forEach(col => {
      filteredRow[col] = row[col];
    });
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
    columnDefs: [{ targets: "_all", className: "dt-body-left" }],
    createdRow: function(row, data, dataIndex) {
      // Get the original row data which includes outcome_id
      const originalRowData = allRows[dataIndex];
      const outcomeId = originalRowData.outcome_id;
      
      // Make the row clickable and add cursor pointer style
      $(row).css('cursor', 'pointer');
      $(row).on('click', function() {
        if (outcomeId) {
          window.open(`https://www.oddsview.com/screen?bet=${outcomeId}`, '_blank');
        }
      });
    }
  });
}
