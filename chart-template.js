// Cache for storing odds data
let oddsCache = {};
let chart = null;
let dataInterval = 2; // Default to every 2nd point
let apiUrl = '';
let selectedSpread = null;
let availableSpreads = [];

// Performance optimizations
const COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
];

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
apiUrl = urlParams.get('api_url');
selectedSpread = urlParams.get('spread');

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

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimized zoom functions
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

// Initialize chart with maximum performance optimizations
function initChart() {
    const ctx = document.getElementById('oddsChart').getContext('2d');
    
    // Disable high DPI scaling for better performance
    ctx.canvas.style.imageRendering = 'pixelated';
    
    Chart.register(ChartZoom);
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // Disable ALL animations for maximum performance
            animation: false,
            transitions: {
                active: { animation: { duration: 0 } },
                resize: { animation: { duration: 0 } },
                show: { animation: { duration: 0 } },
                hide: { animation: { duration: 0 } }
            },
            // Optimize interactions
            interaction: {
                mode: 'nearest',
                intersect: false,
                includeInvisible: false
            },
            // Reduce redraws
            onHover: null,
            hover: {
                animationDuration: 0
            },
            // Optimize layout
            layout: {
                padding: 0
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
                        maxTicksLimit: 8, // Reduced from 10
                        maxRotation: 0, // Prevent rotation for better performance
                        minRotation: 0
                    },
                    grid: {
                        color: '#4a5568',
                        lineWidth: 1,
                        drawOnChartArea: false // Only draw on axis
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'American Odds',
                        color: '#a0aec0'
                    },
                    ticks: {
                        color: '#a0aec0',
                        maxTicksLimit: 8 // Reduced from default
                    },
                    grid: {
                        color: '#4a5568',
                        lineWidth: 1
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
                    enabled: true,
                    mode: 'nearest',
                    intersect: false,
                    backgroundColor: '#2d3748',
                    titleColor: '#00d4ff',
                    bodyColor: '#ffffff',
                    borderColor: '#4a5568',
                    borderWidth: 1,
                    // Optimize tooltip callbacks
                    callbacks: {
                        title: function(context) {
                            return 'Time: ' + context[0].label;
                        },
                        afterBody: function(context) {
                            const validOdds = context
                                .filter(item => item.raw !== null && item.raw !== undefined)
                                .map(item => item.raw);
                            
                            if (validOdds.length > 0) {
                                const average = Math.round(validOdds.reduce((a, b) => a + b, 0) / validOdds.length);
                                return [`Fair Line: ${average}`, `Spread: ${selectedSpread || 'N/A'}`];
                            }
                            return [];
                        }
                    }
                },
                legend: {
                    display: true,
                    labels: {
                        color: '#a0aec0',
                        usePointStyle: false, // Faster rendering
                        boxWidth: 12,
                        boxHeight: 12
                    }
                }
            },
            elements: {
                point: {
                    radius: 0, // Hide points by default for better performance
                    hoverRadius: 2,
                    hitRadius: 4
                },
                line: {
                    tension: 0, // Straight lines are faster
                    borderWidth: 1.5 // Thinner lines
                }
            },
            // Optimize dataset updates
            datasets: {
                line: {
                    pointRadius: 0,
                    pointHoverRadius: 2
                }
            }
        }
    });
}

// Optimized spread selector with minimal DOM manipulation
function createSpreadSelector(spreads) {
    const controlsDiv = document.querySelector('.controls');
    const existingSelector = document.getElementById('spreadSelector');
    
    if (existingSelector) {
        existingSelector.remove();
    }
    
    if (spreads.length === 0) return;
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
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
    
    // Sort spreads once
    const sortedSpreads = spreads.slice().sort((a, b) => parseFloat(a) - parseFloat(b));
    
    // Batch create options
    const optionsHTML = sortedSpreads.map(spread => {
        const displayText = spread > 0 ? `+${spread}` : spread;
        const selected = spread == selectedSpread ? 'selected' : '';
        return `<option value="${spread}" ${selected}>${displayText}</option>`;
    }).join('');
    
    select.innerHTML = optionsHTML;
    select.addEventListener('change', updateSpreadSelection);
    
    spreadContainer.appendChild(label);
    spreadContainer.appendChild(select);
    fragment.appendChild(spreadContainer);
    
    const dataIntervalGroup = controlsDiv.querySelector('.control-group');
    controlsDiv.insertBefore(fragment, dataIntervalGroup);
}

// Optimized spread update
function updateSpreadSelection() {
    const select = document.getElementById('spreadSelect');
    const newSpread = select.value;
    
    if (newSpread !== selectedSpread) {
        selectedSpread = newSpread;
        
        // Batch URL updates
        const currentUrl = new URL(window.location.href);
        const apiUrlObj = new URL(apiUrl);
        apiUrlObj.searchParams.set('spread', selectedSpread);
        currentUrl.searchParams.set('api_url', apiUrlObj.toString());
        
        window.history.replaceState({}, '', currentUrl.toString());
        updateOutcomeInfo();
        
        // Debounced data fetch
        debouncedFetchData();
    }
}

// Debounced fetch function
const debouncedFetchData = debounce(fetchAndDisplayData, 300);

function updateOutcomeInfo() {
    if (!apiUrl) return;
    
    const url = new URL(apiUrl);
    const outcomeId = url.searchParams.get('outcome_id');
    const isLive = url.searchParams.get('live');
    
    const outcomeInfo = [
        `<strong>Outcome ID:</strong> ${outcomeId}`,
        `<strong>Type:</strong> ${isLive === 'true' ? 'LIVE' : 'Pre-match'}`,
        selectedSpread ? `<strong>Current Spread:</strong> ${selectedSpread}` : null
    ].filter(Boolean).join('<br>');
    
    document.getElementById('outcomeInfo').innerHTML = outcomeInfo;
}

// Optimized spread extraction using Set
function extractAvailableSpreads(oddsData) {
    const spreads = new Set();
    
    for (const odds of Object.values(oddsData)) {
        for (const entry of odds) {
            if (entry.length >= 2 && entry[1] != null) {
                spreads.add(entry[1].toString());
            }
        }
    }
    
    return Array.from(spreads);
}

// Optimized spread filtering
function filterOddsBySpread(oddsData, spread) {
    if (!spread) return oddsData;
    
    const spreadFloat = parseFloat(spread);
    const filteredData = {};
    
    for (const [bookmaker, odds] of Object.entries(oddsData)) {
        filteredData[bookmaker] = odds.filter(entry => 
            entry.length >= 2 && parseFloat(entry[1]) === spreadFloat
        );
    }
    
    return filteredData;
}

// More efficient data filtering
function filterDataByInterval(data, interval) {
    if (interval === 1 || data.length <= 2) return data;
    
    const filtered = [data[0]]; // Always include first
    const lastIndex = data.length - 1;
    
    for (let i = interval; i < lastIndex; i += interval) {
        filtered.push(data[i]);
    }
    
    filtered.push(data[lastIndex]); // Always include last
    return filtered;
}

// Optimized data interval update
function updateDataInterval() {
    const select = document.getElementById('dataInterval');
    const newInterval = parseInt(select.value);
    
    if (newInterval !== dataInterval) {
        dataInterval = newInterval;
        
        if (oddsCache?.body?.odds) {
            // Use requestAnimationFrame for smooth updates
            requestAnimationFrame(() => updateChart(oddsCache));
        }
    }
}

function updateStatus(message, type = 'loading') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
}

// Optimized fetch function with better error handling
async function fetchAndDisplayData() {
    const fetchButton = document.getElementById('clearBtn');
    if (fetchButton) fetchButton.disabled = true;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
        const statusEl = document.getElementById('status');
        statusEl.textContent = 'Fetching data...';
        
        const currentTime = Date.now();
        const sixHoursAgo = currentTime - (6 * 60 * 60 * 1000);
        
        const baseUrl = apiUrl.split('?')[0];
        const urlParams = new URLSearchParams(apiUrl.split('?')[1]);
        
        // First call
        urlParams.set('live', 'false');
        urlParams.set('from', sixHoursAgo.toString());
        urlParams.set('to', currentTime.toString());
        
        if (selectedSpread) {
            urlParams.set('spread', selectedSpread);
        }
        
        const firstUrl = `${baseUrl}?${urlParams.toString()}`;
        
        const [firstResponse, secondResponse] = await Promise.all([
            fetch(firstUrl, { signal: controller.signal }),
            // Prepare second call parameters
            (async () => {
                const response = await fetch(firstUrl, { signal: controller.signal });
                const data = await response.json();
                
                // Find closest time more efficiently
                let closestTime = currentTime;
                let minDiff = Infinity;
                
                const filteredData = selectedSpread ? 
                    filterOddsBySpread(data.body?.odds || {}, selectedSpread) : 
                    data.body?.odds || {};
                
                for (const odds of Object.values(filteredData)) {
                    for (const entry of odds) {
                        const diff = Math.abs(new Date(entry[0]).getTime() - currentTime);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestTime = new Date(entry[0]).getTime();
                        }
                    }
                }
                
                // Second call with optimized parameters
                const secondUrlParams = new URLSearchParams(urlParams);
                secondUrlParams.set('live', 'true');
                secondUrlParams.set('from', (Math.floor(closestTime / 1000) + 300).toString() + '000');
                
                return fetch(`${baseUrl}?${secondUrlParams.toString()}`, { signal: controller.signal });
            })()
        ]);
        
        clearTimeout(timeoutId);
        
        const [firstData, secondData] = await Promise.all([
            firstResponse.json(),
            secondResponse.json()
        ]);
        
        // Process data more efficiently
        const processedData = combineAndProcessData(firstData, secondData);
        
        // Update spreads if needed
        if (!selectedSpread && processedData.odds) {
            availableSpreads = extractAvailableSpreads(processedData.odds);
            if (availableSpreads.length > 0) {
                selectedSpread = availableSpreads[0];
                createSpreadSelector(availableSpreads);
                updateOutcomeInfo();
            }
        }
        
        oddsCache = { body: processedData };
        
        // Batch DOM updates
        requestAnimationFrame(() => {
            updateChart(oddsCache);
            updateSummary(oddsCache);
            
            document.getElementById('chartContainer').style.display = 'block';
            document.getElementById('loadingDiv').style.display = 'none';
            
            statusEl.textContent = `Data loaded${selectedSpread ? ' (spread: ' + selectedSpread + ')' : ''}`;
        });
        
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error fetching data:', error);
        
        const errorMsg = error.name === 'AbortError' ? 'Request timed out' : error.message;
        document.getElementById('error').textContent = `❌ Error: ${errorMsg}`;
        document.getElementById('error').style.display = 'block';
        document.getElementById('loadingDiv').style.display = 'none';
    } finally {
        if (fetchButton) fetchButton.disabled = false;
    }
}

// Optimized data combination
function combineAndProcessData(firstData, secondData) {
    const filteredFirst = selectedSpread ? 
        filterOddsBySpread(firstData.body?.odds || {}, selectedSpread) : 
        firstData.body?.odds || {};
    
    const filteredSecond = selectedSpread ? 
        filterOddsBySpread(secondData.body?.odds || {}, selectedSpread) : 
        secondData.body?.odds || {};
    
    const combined = {};
    
    // Combine data sets
    for (const [bookmaker, odds] of Object.entries(filteredFirst)) {
        combined[bookmaker] = [...odds];
    }
    
    for (const [bookmaker, odds] of Object.entries(filteredSecond)) {
        if (!combined[bookmaker]) {
            combined[bookmaker] = [];
        }
        combined[bookmaker].push(...odds);
    }
    
    // Sort once per bookmaker
    for (const bookmaker in combined) {
        combined[bookmaker].sort((a, b) => new Date(a[0]) - new Date(b[0]));
    }
    
    return { odds: combined };
}

// Heavily optimized chart update
function updateChart(data) {
    if (!data.body?.odds) return;
    
    const odds = data.body.odds;
    const bookmakers = Object.keys(odds);
    
    if (bookmakers.length === 0) return;
    
    // Pre-calculate filtered data
    const filteredOdds = {};
    const timePointsSet = new Set();
    let maxPoints = 0;
    
    for (const bookmaker of bookmakers) {
        const originalData = odds[bookmaker];
        maxPoints = Math.max(maxPoints, originalData.length);
        
        filteredOdds[bookmaker] = filterDataByInterval(originalData, dataInterval);
        
        // Collect time points
        for (const entry of filteredOdds[bookmaker]) {
            timePointsSet.add(entry[0]);
        }
    }
    
    const sortedTimePoints = Array.from(timePointsSet).sort();
    
    // Update info efficiently
    const dataInfoEl = document.getElementById('dataInfo');
    const suffix = dataInterval === 1 ? '' : getOrdinalSuffix(dataInterval);
    dataInfoEl.innerHTML = `
        <strong>Data Points:</strong> ${sortedTimePoints.length}/${maxPoints} 
        (every ${dataInterval === 1 ? '' : dataInterval + suffix + ' '}point)
        ${selectedSpread ? `<br><strong>Spread:</strong> ${selectedSpread}` : ''}
    `;
    
    // Create labels once
    const labels = sortedTimePoints.map(timestamp => 
        new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
    
    // Create datasets with pre-allocated arrays
    const datasets = bookmakers.map((bookmaker, i) => {
        const dataMap = new Map();
        filteredOdds[bookmaker].forEach(entry => {
            dataMap.set(entry[0], entry[2]);
        });
        
        return {
            label: bookmaker,
            data: sortedTimePoints.map(timestamp => dataMap.get(timestamp) || null),
            borderColor: COLORS[i % COLORS.length],
            backgroundColor: COLORS[i % COLORS.length] + '20',
            fill: false,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 2,
            borderWidth: 1.5,
            spanGaps: true
        };
    });
    
    // Update chart data in single operation
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.update('none');
    
    // Update fair odds
    updateFairOddsDisplay(odds, sortedTimePoints);
}

// Optimized helper functions
function getOrdinalSuffix(num) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
}

function updateFairOddsDisplay(odds, timePoints) {
    if (timePoints.length === 0) return;
    
    const latestTime = timePoints[timePoints.length - 1];
    const validOdds = [];
    
    for (const bookmakerOdds of Object.values(odds)) {
        const entry = bookmakerOdds.find(item => item[0] === latestTime);
        if (entry && entry[2] != null) {
            validOdds.push(entry[2]);
        }
    }
    
    const fairOddsValue = validOdds.length > 0 ? 
        Math.round(validOdds.reduce((a, b) => a + b, 0) / validOdds.length) : 
        'N/A';
    
    document.getElementById('fairOddsValue').textContent = fairOddsValue;
}

// Optimized summary update with minimal DOM manipulation
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
    
    const summaryCards = [];
    let fairStarting = 0;
    let fairCurrent = 0;
    let validBookmakers = 0;
    
    for (const bookmaker of bookmakers) {
        const data = odds[bookmaker];
        if (data.length === 0) continue;
        
        const starting = data[0][2];
        const current = data[data.length - 1][2];
        const change = current - starting;
        
        fairStarting += starting;
        fairCurrent += current;
        validBookmakers++;
        
        const changeClass = change > 0 ? 'odds-up' : change < 0 ? 'odds-down' : 'odds-neutral';
        const changeText = change === 0 ? 'No change' : (change > 0 ? '+' : '') + change;
        
        summaryCards.push(`
            <div class="summary-card">
                <h3>${bookmaker}</h3>
                <p><strong>Starting:</strong> ${starting}</p>
                <p><strong>Current:</strong> ${current} 
                   <span class="odds-change ${changeClass}">${changeText}</span></p>
                <p><strong>Points:</strong> ${data.length}</p>
                ${selectedSpread ? `<p><strong>Spread:</strong> ${selectedSpread}</p>` : ''}
            </div>
        `);
    }
    
    // Add fair line card
    if (validBookmakers > 0) {
        const fairStart = Math.round(fairStarting / validBookmakers);
        const fairEnd = Math.round(fairCurrent / validBookmakers);
        const fairChange = fairEnd - fairStart;
        
        const changeClass = fairChange > 0 ? 'odds-up' : fairChange < 0 ? 'odds-down' : 'odds-neutral';
        const changeText = fairChange === 0 ? 'No change' : (fairChange > 0 ? '+' : '') + fairChange;
        
        summaryCards.push(`
            <div class="summary-card" style="border-left: 3px solid #FF8C00;">
                <h3>Fair Line</h3>
                <p><strong>Starting:</strong> ${fairStart}</p>
                <p><strong>Current:</strong> ${fairEnd} 
                   <span class="odds-change ${changeClass}">${changeText}</span></p>
                <p><strong>Based on:</strong> ${validBookmakers} books</p>
            </div>
        `);
    }
    
    summaryEl.innerHTML = summaryCards.join('');
}

// Optimized cache clear
function clearCache() {
    oddsCache = {};
    if (chart) {
        chart.data.labels = [];
        chart.data.datasets = [];
        chart.update('none');
    }
    
    // Batch DOM updates
    requestAnimationFrame(() => {
        document.getElementById('summary').innerHTML = '';
        document.getElementById('status').textContent = 'Cache cleared';
        document.getElementById('dataInfo').innerHTML = '<strong>Data Points:</strong> No data loaded.';
        document.getElementById('fairOddsValue').textContent = 'N/A';
    });
}

// Initialize with error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        initChart();
        
        if (!apiUrl) {
            document.getElementById('status').textContent = 'No API URL provided';
            document.getElementById('loadingDiv').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = 'No API URL provided.';
        } else {
            fetchAndDisplayData();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('error').textContent = `Initialization error: ${error.message}`;
        document.getElementById('error').style.display = 'block';
    }
});