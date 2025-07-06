// Cache for storing odds data
let oddsCache = {};
let chart = null;
let dataInterval = 2; // Default to every 2nd point
let apiUrl = '';

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
apiUrl = urlParams.get('api_url');

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
        outcomeInfo += `<strong>Spread:</strong> ${spread}`;
    }
    
    document.getElementById('outcomeInfo').innerHTML = outcomeInfo;
}

// Initialize chart
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
            interaction: {
                mode: 'index',
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
                        color: '#a0aec0'
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
                tooltip: {
                    mode: 'index',
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
                                return [`Fair Line (Average): ${Math.round(average)}`];
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
                    radius: 2,
                    hoverRadius: 4
                },
                line: {
                    tension: 0.1
                }
            }
        }
    });
}

// Filter data points based on interval
function filterDataByInterval(data, interval) {
    if (interval === 1) return data;
    
    return data.filter((item, index) => {
        // Always include the first and last points
        if (index === 0 || index === data.length - 1) {
            return true;
        }
        // Include every nth point
        return index % interval === 0;
    });
}

// Update data interval
function updateDataInterval() {
    const select = document.getElementById('dataInterval');
    dataInterval = parseInt(select.value);
    
    // Re-render chart with cached data if available
    if (oddsCache && oddsCache.body && oddsCache.body.odds) {
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

        // Construct the first URL with proper time range
        const baseUrl = apiUrl.split('?')[0]; // Get base URL without query params
        const urlParams = new URLSearchParams(apiUrl.split('?')[1]); // Get existing params
        urlParams.set('live', 'true');
        urlParams.set('from', fromTime.toString());
        urlParams.set('to', toTime.toString());
        const firstUrl = `${baseUrl}?${urlParams.toString()}`;
        
        const firstResponse = await fetch(firstUrl);
        const firstData = await firstResponse.json();
        
        statusEl.textContent = 'Finding closest time to current time...';
        let closestTime = null;
        let minDiff = Infinity;

        // Search through all sportsbooks for the closest time
        if (firstData.body && firstData.body.odds) {
            for (const [sportsbook, odds] of Object.entries(firstData.body.odds)) {
                for (const entry of odds) {
                    const entryTime = new Date(entry[0]);
                    const diff = Math.abs(entryTime - currentTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestTime = entryTime;
                    }
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
        secondUrlParams.set('live', 'false');
        secondUrlParams.set('from', unixTimeMillisPlus5Min.toString());
        const secondUrl = `${baseUrl}?${secondUrlParams.toString()}`;
        
        const secondResponse = await fetch(secondUrl);
        const secondData = await secondResponse.json();
        
        statusEl.textContent = 'Combining and processing data...';
        
        // Combine data from both calls
        let combinedData = {};
        
        // Add data from first call
        for (const [sportsbook, odds] of Object.entries(firstData.body.odds)) {
            if (!combinedData[sportsbook]) {
                combinedData[sportsbook] = [];
            }
            combinedData[sportsbook] = [...odds];
        }
        
        // Add data from second call
        for (const [sportsbook, odds] of Object.entries(secondData.body.odds)) {
            if (!combinedData[sportsbook]) {
                combinedData[sportsbook] = [];
            }
            combinedData[sportsbook] = [...combinedData[sportsbook], ...odds];
        }
        
        // Sort each sportsbook's data by time
        for (const sportsbook in combinedData) {
            combinedData[sportsbook].sort((a, b) => new Date(a[0]) - new Date(b[0]));
        }
        
        // Cache the combined data
        oddsCache = { body: { odds: combinedData } };
        
        updateChart(oddsCache);
        updateSummary(oddsCache);
        
        // Show chart container and hide loading
        document.getElementById('chartContainer').style.display = 'block';
        document.getElementById('loadingDiv').style.display = 'none';
        
        statusEl.textContent = 'Data loaded successfully';
        
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('error').textContent = `❌ Error: ${error.message}`;
        document.getElementById('error').style.display = 'block';
        document.getElementById('loadingDiv').style.display = 'none';
    } finally {
        if (fetchButton) fetchButton.disabled = false;
    }
}

// Update chart with new data
function updateChart(data) {
    // Handle data format
    let odds = {};

    if (data.body && data.body.odds) {
        // Your data format - already grouped by bookmaker
        odds = data.body.odds;
    } else {
        console.error('Unexpected data format:', data);
        return;
    }
    
    const bookmakers = Object.keys(odds);
    
    // Clear existing data
    chart.data.labels = [];
    chart.data.datasets = [];
    
    // Colors for different bookmakers
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];
    
    let allTimePoints = new Set();
    let totalOriginalPoints = 0;
    
    // Filter data by interval for each bookmaker
    const filteredOdds = {};
    bookmakers.forEach(bookmaker => {
        const originalData = odds[bookmaker];
        totalOriginalPoints = Math.max(totalOriginalPoints, originalData.length);
        
        filteredOdds[bookmaker] = filterDataByInterval(originalData, dataInterval);
        filteredOdds[bookmaker].forEach(entry => {
            allTimePoints.add(entry[0]);
        });
    });
    
    // Sort timestamps
    const sortedTimePoints = Array.from(allTimePoints).sort();
    
    // Update data info
    const dataInfoEl = document.getElementById('dataInfo');
    dataInfoEl.innerHTML = `
        <strong>Data Points:</strong> Showing ${sortedTimePoints.length} out of ${totalOriginalPoints} total points 
        (every ${dataInterval === 1 ? '' : dataInterval + getOrdinalSuffix(dataInterval) + ' '}point${dataInterval === 1 ? '' : ', plus first and last'})
    `;
    
    // Create labels (formatted time)
    chart.data.labels = sortedTimePoints.map(timestamp => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    });
    
    // Create datasets for each bookmaker
    bookmakers.forEach((bookmaker, index) => {
        const bookmakerData = filteredOdds[bookmaker];
        
        // Create data array aligned with time points
        const dataPoints = sortedTimePoints.map(timestamp => {
            const entry = bookmakerData.find(item => item[0] === timestamp);
            return entry ? entry[2] : null; // American odds (index 2)
        });
        
        chart.data.datasets.push({
            label: bookmaker,
            data: dataPoints,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            fill: false,
            tension: 0.1,
            pointRadius: dataInterval === 1 ? 1 : 2,
            pointHoverRadius: dataInterval === 1 ? 3 : 4,
            borderWidth: 2,
            spanGaps: true
        });
    });
    
    chart.update();
    
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
    
    Object.keys(odds).forEach(bookmaker => {
        const entry = odds[bookmaker].find(item => item[0] === latestTime);
        if (entry && entry[2] !== null && entry[2] !== undefined) {
            oddsAtLatestTime.push(entry[2]);
        }
    });
    
    if (oddsAtLatestTime.length > 0) {
        const fairOdds = Math.round(oddsAtLatestTime.reduce((a, b) => a + b, 0) / oddsAtLatestTime.length);
        document.getElementById('fairOddsValue').textContent = fairOdds;
    } else {
        document.getElementById('fairOddsValue').textContent = 'N/A';
    }
}

// Update summary statistics
function updateSummary(data) {
    const summaryEl = document.getElementById('summary');
    
    // Handle different data formats
    let odds = {};
    
    if (data.body && data.body.odds) {
        odds = data.body.odds;
    } else if (Array.isArray(data.body)) {
        const groupedOdds = {};
        data.body.forEach(item => {
            const bookmaker = item.sportsbook || item.book || 'Unknown';
            if (!groupedOdds[bookmaker]) {
                groupedOdds[bookmaker] = [];
            }
            groupedOdds[bookmaker].push([
                item.timestamp,
                item.decimal_odds || americanOddsToDecimal(item.american_odds),
                parseInt(item.american_odds) || 0
            ]);
        });
        odds = groupedOdds;
    } else if (Array.isArray(data)) {
        const groupedOdds = {};
        data.forEach(item => {
            const bookmaker = item.sportsbook || item.book || 'Unknown';
            if (!groupedOdds[bookmaker]) {
                groupedOdds[bookmaker] = [];
            }
            groupedOdds[bookmaker].push([
                item.timestamp,
                item.decimal_odds || americanOddsToDecimal(item.american_odds),
                parseInt(item.american_odds) || 0
            ]);
        });
        odds = groupedOdds;
    }
    
    if (!odds || Object.keys(odds).length === 0) {
        summaryEl.innerHTML = '<p>No data available</p>';
        return;
    }
    
    const bookmakers = Object.keys(odds);
    
    let summaryHTML = '';
    let fairLineStarting = 0;
    let fairLineCurrent = 0;
    let validBookmakers = 0;
    
    bookmakers.forEach(bookmaker => {
        const bookmakerData = odds[bookmaker];
        
        if (bookmakerData.length === 0) return;
        
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
        
        summaryHTML += `
            <div class="summary-card">
                <h3>${bookmaker}</h3>
                <p><strong>Starting Odds:</strong> ${startingOdds}</p>
                <p><strong>Current Odds:</strong> ${currentOdds} 
                   <span class="odds-change ${changeClass}">${changeText}</span></p>
                <p><strong>Total Data Points:</strong> ${bookmakerData.length}</p>
            </div>
        `;
    });
    
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
        
        summaryHTML += `
            <div class="summary-card" style="border-left: 3px solid #FF8C00;">
                <h3>Fair Line (Average)</h3>
                <p><strong>Starting Odds:</strong> ${fairStarting}</p>
                <p><strong>Current Odds:</strong> ${fairCurrent} 
                   <span class="odds-change ${fairChangeClass}">${fairChangeText}</span></p>
                <p><strong>Based on:</strong> ${validBookmakers} bookmakers</p>
            </div>
        `;
    }
    
    summaryEl.innerHTML = summaryHTML;
}

// Clear cache
function clearCache() {
    oddsCache = {};
    if (chart) {
        chart.data.labels = [];
        chart.data.datasets = [];
        chart.update();
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
