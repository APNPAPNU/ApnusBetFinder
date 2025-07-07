// Cache for storing odds data
let oddsCache = {};
let chart = null;
let dataInterval = 2; // Default to every 2nd point
let apiUrl = '';
let selectedSpread = null; // Track selected spread
let availableSpreads = []; // Available spreads from API

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
apiUrl = urlParams.get('api_url');
selectedSpread = urlParams.get('spread'); // Get current spread from URL

// Display API URL
document.getElementById('apiUrl').textContent = apiUrl || 'No URL provided';

// Extract outcome info from URL
if (apiUrl) {
    const url = new URL(apiUrl);
    const outcomeId = url.searchParams.get('outcome_id');
    const isLive = url.searchParams.get('live');
    const spread = url.searchParams.get('spread');
    
    let outcomeInfo = `<strong>Outcome ID:</strong> ${outcomeId}<br>`;
    outcomeInfo += `<strong>Type:</strong> ${isLive === 'true' ? 'LIVE' : 'Pre-match'}<br>`;
    if (spread) {
        outcomeInfo += `<strong>Current Spread:</strong> ${spread}`;
    }
    
    document.getElementById('outcomeInfo').innerHTML = outcomeInfo;
}
// Add these functions anywhere in your chart-template.js file

function zoomIn() {
    if (chart) {
        chart.zoom(1.2);
    }
}

function zoomOut() {
    if (chart) {
        chart.zoom(0.8);
    }
}

function resetZoom() {
    if (chart) {
        chart.resetZoom();
    }
}

// Optional: Dynamically adjust data points based on zoom level
function updateDataBasedOnZoom(chartInstance) {
    const zoomLevel = chartInstance.getZoomLevel();
    let newInterval = dataInterval;
    
    if (zoomLevel > 2) {
        newInterval = 1; // Show all points when zoomed in
    } else if (zoomLevel > 1.5) {
        newInterval = 2;
    } else if (zoomLevel < 0.5) {
        newInterval = 20; // Show fewer points when zoomed out
    }
    
    if (newInterval !== dataInterval) {
        dataInterval = newInterval;
        document.getElementById('dataInterval').value = newInterval;
        if (oddsCache?.body?.odds) {
            updateChart(oddsCache);
        }
    }
}
// Add this line right after: chart = new Chart(ctx, {
Chart.register(ChartZoom);
// Initialize chart with optimized settings
function initChart() {
    const ctx = document.getElementById('oddsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 0 // Disable animations for better performance
            },
            interaction: {
                mode: 'nearest', // More efficient than 'index'
                intersect: false,
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#a0aec0'
                    },
                    ticks: {
                        color: '#a0aec0',
                        maxTicksLimit: 10 // Limit number of x-axis labels
                    },
                    grid: {
                        color: '#4a5568'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'American Odds',
                        color: '#a0aec0'
                    },
                    ticks: {
                        color: '#a0aec0'
                    },
                    grid: {
                        color: '#4a5568'
                    }
                }
            },
        plugins: {
    zoom: {
        zoom: {
            wheel: {
                enabled: true,
                speed: 0.1,
            },
            pinch: {
                enabled: true
            },
            mode: 'x',
            limits: {
                x: {min: 'original', max: 'original'},
            },
            onZoomComplete: function({chart}) {
                // Zoom to most recent time (right side of chart)
                zoomToMostRecent(chart);
            }
        },
        pan: {
            enabled: true,
            mode: 'x',
            limits: {
                x: {min: 'original', max: 'original'},
            }
        }
    },

                tooltip: {
                    mode: 'nearest',
                    intersect: false,
                    backgroundColor: '#2d3748',
                    titleColor: '#00d4ff',
                    bodyColor: '#ffffff',
                    borderColor: '#4a5568',
                    borderWidth: 1,
                    callbacks: {
                        title: function(context) {
                            return 'Time: ' + context[0].label;
                        },
                        afterBody: function(context) {
                            // Calculate fair line (average) for tooltip
                            const validOdds = context
                                .filter(item => item.raw !== null && item.raw !== undefined)
                                .map(item => item.raw);
                            
                            if (validOdds.length > 0) {
                                const average = validOdds.reduce((a, b) => a + b, 0) / validOdds.length;
                                return [`Fair Line (Average): ${Math.round(average)}`, `Spread: ${selectedSpread || 'N/A'}`];
                            }
                            return [];
                        }
                    }
                },
                legend: {
                    display: true,
                    labels: {
                        color: '#a0aec0'
                    }
                }
            },
            elements: {
                point: {
                    radius: 1, // Smaller points for better performance
                    hoverRadius: 3
                },
                line: {
                    tension: 0 // Straight lines are faster to render
                }
            }
        }
    });
}

// Create spread selector dropdown
function createSpreadSelector(spreads) {
    const controlsDiv = document.querySelector('.controls');
    
    // Remove existing spread selector if it exists
    const existingSelector = document.getElementById('spreadSelector');
    if (existingSelector) {
        existingSelector.remove();
    }
    
    if (spreads.length === 0) return;
    
    // Create spread selector container
    const spreadContainer = document.createElement('div');
    spreadContainer.className = 'control-group';
    spreadContainer.id = 'spreadSelector';
    
    const label = document.createElement('label');
    label.htmlFor = 'spreadSelect';
    label.textContent = 'Select Spread:';
    label.style.color = '#a0aec0';
    
    const select = document.createElement('select');
    select.id = 'spreadSelect';
    select.style.cssText = `
        padding: 5px 10px;
        border: 1px solid #4a5568;
        border-radius: 4px;
        background-color: #2d3748;
        color: #ffffff;
        margin-left: 10px;
    `;
    
    // Sort spreads numerically
    const sortedSpreads = [...spreads].sort((a, b) => parseFloat(a) - parseFloat(b));
    
    // Add options
    sortedSpreads.forEach(spread => {
        const option = document.createElement('option');
        option.value = spread;
        option.textContent = spread > 0 ? `+${spread}` : spread;
        if (spread == selectedSpread) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Add event listener
    select.addEventListener('change', updateSpreadSelection);
    
    spreadContainer.appendChild(label);
    spreadContainer.appendChild(select);
    
    // Insert before the data interval selector
    const dataIntervalGroup = controlsDiv.querySelector('.control-group');
    controlsDiv.insertBefore(spreadContainer, dataIntervalGroup);
}

// Update spread selection
function updateSpreadSelection() {
    const select = document.getElementById('spreadSelect');
    const newSpread = select.value;
    
    if (newSpread !== selectedSpread) {
        selectedSpread = newSpread;
        
        // Update URL to reflect new spread
        const currentUrl = new URL(window.location.href);
        const apiUrlObj = new URL(apiUrl);
        apiUrlObj.searchParams.set('spread', selectedSpread);
        currentUrl.searchParams.set('api_url', apiUrlObj.toString());
        
        // Update browser URL without reload
        window.history.replaceState({}, '', currentUrl.toString());
        
        // Update displayed info
        updateOutcomeInfo();
        
        // Re-fetch data with new spread
        fetchAndDisplayData();
    }
}

// Update outcome info display
function updateOutcomeInfo() {
    if (apiUrl) {
        const url = new URL(apiUrl);
        const outcomeId = url.searchParams.get('outcome_id');
        const isLive = url.searchParams.get('live');
        
        let outcomeInfo = `<strong>Outcome ID:</strong> ${outcomeId}<br>`;
        outcomeInfo += `<strong>Type:</strong> ${isLive === 'true' ? 'LIVE' : 'Pre-match'}<br>`;
        if (selectedSpread) {
            outcomeInfo += `<strong>Current Spread:</strong> ${selectedSpread}`;
        }
        
        document.getElementById('outcomeInfo').innerHTML = outcomeInfo;
    }
}

// Extract available spreads from odds data
function extractAvailableSpreads(oddsData) {
    const spreads = new Set();
    
    // Look through all bookmakers and all entries to find unique spreads
    for (const bookmaker in oddsData) {
        for (const entry of oddsData[bookmaker]) {
            if (entry.length >= 2 && entry[1] !== null && entry[1] !== undefined) {
                spreads.add(entry[1].toString());
            }
        }
    }
    
    return Array.from(spreads);
}

// Filter odds data by selected spread
function filterOddsBySpread(oddsData, spread) {
    if (!spread) return oddsData;
    
    const filteredData = {};
    const spreadFloat = parseFloat(spread);
    
    for (const bookmaker in oddsData) {
        filteredData[bookmaker] = oddsData[bookmaker].filter(entry => {
            return entry.length >= 2 && parseFloat(entry[1]) === spreadFloat;
        });
    }
    
    return filteredData;
}

// Optimized data filtering with early exit
function filterDataByInterval(data, interval) {
    if (interval === 1) return data;
    
    const filtered = [];
    const lastIndex = data.length - 1;
    
    for (let i = 0; i < data.length; i++) {
        // Always include first and last points
        if (i === 0 || i === lastIndex || i % interval === 0) {
            filtered.push(data[i]);
        }
    }
    
    return filtered;
}

// Update data interval
function updateDataInterval() {
    const select = document.getElementById('dataInterval');
    dataInterval = parseInt(select.value);
    
    // Re-render chart with cached data if available
    if (oddsCache?.body?.odds) {
        updateChart(oddsCache);
    }
}

function updateStatus(message, type = 'loading') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
}

async function fetchAndDisplayData() {
    const fetchButton = document.getElementById('clearBtn');
    if (fetchButton) fetchButton.disabled = true;
    
    try {
        const statusEl = document.getElementById('status');
        statusEl.textContent = 'Making first API call (live=false)...';
        
        // Calculate time range (6 hours before current time to current time)
        const currentTime = new Date();
        const sixHoursAgo = new Date(currentTime.getTime() - (6 * 60 * 60 * 1000));

        // Convert to Unix timestamps in milliseconds
        const fromTime = sixHoursAgo.getTime();
        const toTime = currentTime.getTime();

        // Construct the first URL with proper time range and spread
        const baseUrl = apiUrl.split('?')[0]; // Get base URL without query params
        const urlParams = new URLSearchParams(apiUrl.split('?')[1]); // Get existing params
        urlParams.set('live', 'false');
        urlParams.set('from', fromTime.toString());
        urlParams.set('to', toTime.toString());
        
        // Add spread parameter if selected
        if (selectedSpread) {
            urlParams.set('spread', selectedSpread);
        }
        
        const firstUrl = `${baseUrl}?${urlParams.toString()}`;
        
        const firstResponse = await fetch(firstUrl);
        const firstData = await firstResponse.json();
        
        // Extract available spreads from first call if we don't have a selected spread
        if (!selectedSpread && firstData.body?.odds) {
            availableSpreads = extractAvailableSpreads(firstData.body.odds);
            if (availableSpreads.length > 0) {
                // Set default spread to first available
                selectedSpread = availableSpreads[0];
                createSpreadSelector(availableSpreads);
                updateOutcomeInfo();
                
                // Update URL with selected spread and restart fetch
                const apiUrlObj = new URL(apiUrl);
                apiUrlObj.searchParams.set('spread', selectedSpread);
                urlParams.set('spread', selectedSpread);
                apiUrl = apiUrlObj.toString();
                document.getElementById('apiUrl').textContent = apiUrl;
            }
        }
        
        statusEl.textContent = 'Finding closest time to current time...';
        let closestTime = null;
        let minDiff = Infinity;

        // Filter data by selected spread first
        const filteredFirstData = selectedSpread ? 
            filterOddsBySpread(firstData.body?.odds || {}, selectedSpread) : 
            firstData.body?.odds || {};

        // Optimized search for closest time
        for (const [sportsbook, odds] of Object.entries(filteredFirstData)) {
            for (const entry of odds) {
                const entryTime = new Date(entry[0]);
                const diff = Math.abs(entryTime - currentTime);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestTime = entryTime;
                }
            }
        }

        // If no data found, use current time
        if (!closestTime) {
            closestTime = currentTime;
        }
        
        // Convert to Unix timestamp and add 5 minutes
        const unixTime = Math.floor(closestTime.getTime() / 1000);
        const unixTimePlus5Min = unixTime + (5 * 60);
        const unixTimeMillisPlus5Min = unixTimePlus5Min * 1000;
        
        statusEl.textContent = 'Making second API call (live=true) with adjusted time...';
        
        // Second API call with live=true and adjusted time
        const secondUrlParams = new URLSearchParams(firstUrl.split('?')[1]);
        secondUrlParams.set('live', 'true');
        secondUrlParams.set('from', unixTimeMillisPlus5Min.toString());
        const secondUrl = `${baseUrl}?${secondUrlParams.toString()}`;
        
        const secondResponse = await fetch(secondUrl);
        const secondData = await secondResponse.json();
        
        statusEl.textContent = 'Combining and processing data...';
        
        // Filter second data by spread as well
        const filteredSecondData = selectedSpread ? 
            filterOddsBySpread(secondData.body?.odds || {}, selectedSpread) : 
            secondData.body?.odds || {};
        
        // Optimized data combination
        const combinedData = {};
        
        // Add data from first call
        for (const [sportsbook, odds] of Object.entries(filteredFirstData)) {
            combinedData[sportsbook] = [...odds];
        }
        
        // Add data from second call
        for (const [sportsbook, odds] of Object.entries(filteredSecondData)) {
            if (!combinedData[sportsbook]) {
                combinedData[sportsbook] = [];
            }
            combinedData[sportsbook].push(...odds);
        }
        
        // Sort each sportsbook's data by time (optimize with a single sort)
        for (const sportsbook in combinedData) {
            combinedData[sportsbook].sort((a, b) => new Date(a[0]) - new Date(b[0]));
        }
        
        // Cache the combined data
        oddsCache = { body: { odds: combinedData } };
        
        // Create spread selector if we have multiple spreads available
        if (availableSpreads.length === 0) {
            availableSpreads = extractAvailableSpreads(combinedData);
            if (availableSpreads.length > 1) {
                createSpreadSelector(availableSpreads);
            }
        }
        
        updateChart(oddsCache);
        updateSummary(oddsCache);
        
        // Show chart container and hide loading
        document.getElementById('chartContainer').style.display = 'block';
        document.getElementById('loadingDiv').style.display = 'none';
        
        statusEl.textContent = `Data loaded successfully${selectedSpread ? ' for spread ' + selectedSpread : ''}`;
        
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('error').textContent = `❌ Error: ${error.message}`;
        document.getElementById('error').style.display = 'block';
        document.getElementById('loadingDiv').style.display = 'none';
    } finally {
        if (fetchButton) fetchButton.disabled = false;
    }
}

// Optimized chart update with better memory management
function updateChart(data) {
    if (!data.body?.odds) {
        console.error('Unexpected data format:', data);
        return;
    }
    
    const odds = data.body.odds;
    const bookmakers = Object.keys(odds);
    
    if (bookmakers.length === 0) return;
    
    // Colors for different bookmakers
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];
    
    // Pre-allocate arrays and use Set for better performance
    const allTimePoints = new Set();
    let totalOriginalPoints = 0;
    
    // Filter data by interval for each bookmaker
    const filteredOdds = {};
    for (const bookmaker of bookmakers) {
        const originalData = odds[bookmaker];
        totalOriginalPoints = Math.max(totalOriginalPoints, originalData.length);
        
        filteredOdds[bookmaker] = filterDataByInterval(originalData, dataInterval);
        
        // Add time points to set
        for (const entry of filteredOdds[bookmaker]) {
            allTimePoints.add(entry[0]);
        }
    }
    
    // Convert Set to Array and sort once
    const sortedTimePoints = Array.from(allTimePoints).sort();
    
    // Update data info
    const dataInfoEl = document.getElementById('dataInfo');
    dataInfoEl.innerHTML = `
        <strong>Data Points:</strong> Showing ${sortedTimePoints.length} out of ${totalOriginalPoints} total points 
        (every ${dataInterval === 1 ? '' : dataInterval + getOrdinalSuffix(dataInterval) + ' '}point${dataInterval === 1 ? '' : ', plus first and last'})
        ${selectedSpread ? `<br><strong>Spread Filter:</strong> ${selectedSpread}` : ''}
    `;
    
    // Create labels (formatted time) - cache date objects
    const labels = sortedTimePoints.map(timestamp => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    });
    
    // Create datasets for each bookmaker
    const datasets = [];
    for (let i = 0; i < bookmakers.length; i++) {
        const bookmaker = bookmakers[i];
        const bookmakerData = filteredOdds[bookmaker];
        
        // Create lookup map for faster data access
        const dataMap = new Map();
        for (const entry of bookmakerData) {
            dataMap.set(entry[0], entry[2]); // entry[2] is the American odds
        }
        
        // Create data array aligned with time points
        const dataPoints = sortedTimePoints.map(timestamp => 
            dataMap.get(timestamp) || null
        );
        
        datasets.push({
            label: bookmaker,
            data: dataPoints,
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length] + '20',
            fill: false,
            tension: 0,
            pointRadius: dataInterval === 1 ? 1 : 2,
            pointHoverRadius: dataInterval === 1 ? 3 : 4,
            borderWidth: 2,
            spanGaps: true
        });
    }
    
    // Update chart data efficiently
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.update('none'); // Skip animation for better performance
    
    // Update fair odds display
    updateFairOddsDisplay(odds, sortedTimePoints);
}

// Helper function to get ordinal suffix
function getOrdinalSuffix(num) {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return 'th';
    }
    
    switch (lastDigit) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// Update fair odds display
function updateFairOddsDisplay(odds, timePoints) {
    if (timePoints.length === 0) return;
    
    const latestTime = timePoints[timePoints.length - 1];
    const oddsAtLatestTime = [];
    
    for (const bookmaker of Object.keys(odds)) {
        const entry = odds[bookmaker].find(item => item[0] === latestTime);
        if (entry && entry[2] !== null && entry[2] !== undefined) {
            oddsAtLatestTime.push(entry[2]);
        }
    }
    
    if (oddsAtLatestTime.length > 0) {
        const fairOdds = Math.round(oddsAtLatestTime.reduce((a, b) => a + b, 0) / oddsAtLatestTime.length);
        document.getElementById('fairOddsValue').textContent = fairOdds;
    } else {
        document.getElementById('fairOddsValue').textContent = 'N/A';
    }
}

// Optimized summary update
function updateSummary(data) {
    const summaryEl = document.getElementById('summary');
    
    if (!data.body?.odds) {
        summaryEl.innerHTML = '<p>No data available</p>';
        return;
    }
    
    const odds = data.body.odds;
    const bookmakers = Object.keys(odds);
    
    if (bookmakers.length === 0) {
        summaryEl.innerHTML = '<p>No data available</p>';
        return;
    }
    
    // Pre-allocate arrays
    const summaryCards = [];
    let fairLineStarting = 0;
    let fairLineCurrent = 0;
    let validBookmakers = 0;
    
    for (const bookmaker of bookmakers) {
        const bookmakerData = odds[bookmaker];
        
        if (bookmakerData.length === 0) continue;
        
        const startingOdds = bookmakerData[0][2];
        const currentOdds = bookmakerData[bookmakerData.length - 1][2];
        const change = currentOdds - startingOdds;
        
        // Add to fair line calculation
        fairLineStarting += startingOdds;
        fairLineCurrent += currentOdds;
        validBookmakers++;
        
        let changeClass = 'odds-neutral';
        let changeText = 'No change';
        
        if (change > 0) {
            changeClass = 'odds-up';
            changeText = `+${change}`;
        } else if (change < 0) {
            changeClass = 'odds-down';
            changeText = `${change}`;
        }
        
        summaryCards.push(`
            <div class="summary-card">
                <h3>${bookmaker}</h3>
                <p><strong>Starting Odds:</strong> ${startingOdds}</p>
                <p><strong>Current Odds:</strong> ${currentOdds} 
                   <span class="odds-change ${changeClass}">${changeText}</span></p>
                <p><strong>Total Data Points:</strong> ${bookmakerData.length}</p>
                ${selectedSpread ? `<p><strong>Spread:</strong> ${selectedSpread}</p>` : ''}
            </div>
        `);
    }
    
    // Add fair line summary
    if (validBookmakers > 0) {
        const fairStarting = Math.round(fairLineStarting / validBookmakers);
        const fairCurrent = Math.round(fairLineCurrent / validBookmakers);
        const fairChange = fairCurrent - fairStarting;
        
        let fairChangeClass = 'odds-neutral';
        let fairChangeText = 'No change';
        
        if (fairChange > 0) {
            fairChangeClass = 'odds-up';
            fairChangeText = `+${fairChange}`;
        } else if (fairChange < 0) {
            fairChangeClass = 'odds-down';
            fairChangeText = `${fairChange}`;
        }
        
        summaryCards.push(`
            <div class="summary-card" style="border-left: 3px solid #FF8C00;">
                <h3>Fair Line (Average)</h3>
                <p><strong>Starting Odds:</strong> ${fairStarting}</p>
                <p><strong>Current Odds:</strong> ${fairCurrent} 
                   <span class="odds-change ${fairChangeClass}">${fairChangeText}</span></p>
                <p><strong>Based on:</strong> ${validBookmakers} bookmakers</p>
                ${selectedSpread ? `<p><strong>Spread:</strong> ${selectedSpread}</p>` : ''}
            </div>
        `);
    }
    
    summaryEl.innerHTML = summaryCards.join('');
}

// Clear cache
function clearCache() {
    oddsCache = {};
    if (chart) {
        chart.data.labels = [];
        chart.data.datasets = [];
        chart.update('none');
    }
    document.getElementById('summary').innerHTML = '';
    document.getElementById('status').textContent = 'Cache cleared';
    document.getElementById('dataInfo').innerHTML = '<strong>Data Points:</strong> No data loaded.';
    document.getElementById('fairOddsValue').textContent = 'N/A';
}

// Helper function to convert American odds to decimal
function americanOddsToDecimal(americanOdds) {
    if (americanOdds === 0) return 'N/A';
    if (americanOdds > 0) {
        return (americanOdds / 100 + 1).toFixed(2);
    } else {
        return (100 / Math.abs(americanOdds) + 1).toFixed(2);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initChart();
    
    if (!apiUrl) {
        document.getElementById('status').textContent = 'No API URL provided';
        document.getElementById('loadingDiv').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = 'No API URL provided. Please check the link and try again.';
    } else {
        fetchAndDisplayData();
    }
});