class BettingDataScraper {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.refreshInterval = null;
        this.isLoading = false;
        this.refreshIntervalTime = 3000; // Default 3 seconds
        this.autoRefreshEnabled = true;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startAutoRefresh();
        this.fetchData();
    }

    setupEventListeners() {
        // Filter event listeners
        ['bookFilter', 'sportFilter', 'evFilter', 'liveFilter', 'searchFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.applyFilters());
            document.getElementById(id).addEventListener('input', () => this.applyFilters());
        });

        // Refresh control listeners
        document.getElementById('refreshToggle').addEventListener('change', (e) => {
            this.autoRefreshEnabled = e.target.checked;
            if (this.autoRefreshEnabled) {
                this.startAutoRefresh();
                this.updateStatus('Auto refresh enabled', 'success');
            } else {
                this.stopAutoRefresh();
                this.updateStatus('Auto refresh paused', 'paused');
            }
        });

        document.getElementById('refreshInterval').addEventListener('change', (e) => {
            this.refreshIntervalTime = parseInt(e.target.value) * 1000;
            if (this.autoRefreshEnabled) {
                this.startAutoRefresh(); // Restart with new interval
            }
        });
    }

    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear existing interval
        if (this.autoRefreshEnabled) {
            this.refreshInterval = setInterval(() => {
                if (!this.isLoading) {
                    this.fetchData();
                }
            }, this.refreshIntervalTime);
        }
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    updateStatus(text, type = 'loading') {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        indicator.className = `status-indicator ${type}`;
        statusText.textContent = text;
    }

    async fetchData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.updateStatus('Fetching data...', 'loading');

        try {
            // Fetch all data sources
            const [openoddsData, cloudfrontData, awsData] = await Promise.all([
                this.fetchOpenOddsData(),
                this.fetchCloudfrontData(),
                this.fetchAWSData()
            ]);

            // Process and combine data
            this.data = this.processData(openoddsData, cloudfrontData, awsData);
            this.updateFilterOptions();
            this.applyFilters();
            
            this.updateStatus(`Data updated successfully`, 'success');
            document.getElementById('lastUpdate').textContent = `Last Update: ${new Date().toLocaleTimeString()}`;
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.updateStatus('Error fetching data', 'error');
            this.showError('Failed to fetch betting data. Please check console for details.');
        }
        
        this.isLoading = false;
    }

    async fetchOpenOddsData() {
        const livePayload = {
            keys: ["ev_stream"],
            filters: {
                filtered_sportsbooks: ["DRAFTKINGS","FANDUEL","BETMGM","CAESARS","ESPN","HARDROCK","BALLYBET","BETONLINE","BET365","FANATICS","FLIFF", "NONE"],
                must_have_sportsbooks: [""]
            },
            filter: {}
        };

        const prematchPayload = {
            keys: ["ev_stream_prematch"],
            filters: {
                filtered_sportsbooks: ["DRAFTKINGS","FANDUEL","BETMGM","CAESARS","ESPN","HARDROCK","BALLYBET","BETONLINE","BET365","FANATICS","FLIFF","NONE"],
                must_have_sportsbooks: [""]
            },
            filter: {}
        };

        try {
            const [liveResponse, prematchResponse] = await Promise.all([
                fetch('https://api.openodds.gg/getData', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: JSON.stringify(livePayload)
                }),
                fetch('https://api.openodds.gg/getData', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: JSON.stringify(prematchPayload)
                })
            ]);

            const liveData = liveResponse.ok ? await liveResponse.json() : [];
            const prematchData = prematchResponse.ok ? await prematchResponse.json() : [];

            // Tag data with live/prematch flag
            liveData.forEach(item => item._is_live = true);
            prematchData.forEach(item => item._is_live = false);

            return [...liveData, ...prematchData];
        } catch (error) {
            console.error('Error fetching OpenOdds data:', error);
            return [];
        }
    }

    async fetchCloudfrontData() {
        try {
            const response = await fetch('https://d6ailk8q6o27n.cloudfront.net/livegames');
            if (!response.ok) return [];
            
            const data = await response.json();
            if (data.body) {
                const games = [];
                if (data.body.prematch_games) games.push(...data.body.prematch_games);
                if (data.body.live_games) games.push(...data.body.live_games);
                return games;
            }
            return [];
        } catch (error) {
            console.error('Error fetching Cloudfront data:', error);
            return [];
        }
    }

    async fetchAWSData() {
        const sports = ["basketball", "baseball", "football", "soccer", "hockey"];
        let allData = {};

        for (const sport of sports) {
            try {
                const response = await fetch(`https://49pzwry2rc.execute-api.us-east-1.amazonaws.com/prod/getLiveGames?sport=${sport}&live=false`);
                if (response.ok) {
                    const data = await response.json();
                    const games = data.body || data;
                    Object.assign(allData, games);
                }
                await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
            } catch (error) {
                console.error(`Error fetching AWS data for ${sport}:`, error);
            }
        }

        return allData;
    }

    processData(openoddsData, cloudfrontData, awsData) {
        const processed = [];

        // Extract OpenOdds records
        for (const item of openoddsData) {
            if (item.channel && item.channel.includes("ev_stream") && item.payload) {
                for (const payloadItem of item.payload) {
                    try {
                        const record = {
                            live: item._is_live || false,
                            outcome_id: payloadItem.outcome_id,
                            book: payloadItem.book,
                            spread: payloadItem.spread,
                            message: payloadItem.message,
                            ev: payloadItem.ev_model?.ev,
                            last_ts: payloadItem.ev_model?.last_ts,
                            american_odds: payloadItem.ev_model?.american_odds,
                            true_prob: payloadItem.ev_model?.true_prob,
                            deeplink: payloadItem.ev_model?.deeplink,
                            ev_spread: payloadItem.ev_model?.spread
                        };

                        // Find matching game info from Cloudfront
                        const gameInfo = this.findGameInfo(record.outcome_id, cloudfrontData, awsData);
                        Object.assign(record, gameInfo);

                        if (record.outcome_id) {
                            processed.push(record);
                        }
                    } catch (error) {
                        console.error('Error processing record:', error);
                    }
                }
            }
        }

        return processed;
    }

    findGameInfo(outcomeId, cloudfrontData, awsData) {
        const info = {};
        
        // Find in Cloudfront data
        for (const game of cloudfrontData) {
            if (game.markets) {
                for (const [marketId, market] of Object.entries(game.markets)) {
                    if (market.outcomes) {
                        for (const outcome of Object.values(market.outcomes)) {
                            if (outcome.outcome_id === outcomeId) {
                                info.market_id = marketId;
                                info.market_type = market.market_type;
                                info.display_name = market.display_name;
                                info.game_name = game.game_name;
                                info.home_team = game.home_team;
                                info.away_team = game.away_team;
                                info.sport = game.sport;
                                info.league = game.league;
                                info.player_1 = game.player_1;
                                info.player_2 = game.player_2;
                                
                                // Find additional info in AWS data
                                if (info.market_id && awsData) {
                                    for (const [gameId, awsGame] of Object.entries(awsData)) {
                                        if (awsGame.markets && awsGame.markets[info.market_id]) {
                                            info.aws_game_date = awsGame.game_date;
                                            break;
                                        }
                                    }
                                }
                                
                                return info;
                            }
                        }
                    }
                }
            }
        }
        
        return info;
    }

    updateFilterOptions() {
        // Update book filter
        const books = [...new Set(this.data.map(d => d.book).filter(Boolean))].sort();
        this.updateSelectOptions('bookFilter', books);

        // Update sport filter
        const sports = [...new Set(this.data.map(d => d.sport).filter(Boolean))].sort();
        this.updateSelectOptions('sportFilter', sports);
    }

    updateSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        // Clear existing options except first
        select.innerHTML = select.children[0].outerHTML;
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
        
        select.value = currentValue;
    }

    applyFilters() {
        let filtered = [...this.data];

        // Book filter
        const bookFilter = document.getElementById('bookFilter').value;
        if (bookFilter) {
            filtered = filtered.filter(d => d.book === bookFilter);
        }

        // Sport filter
        const sportFilter = document.getElementById('sportFilter').value;
        if (sportFilter) {
            filtered = filtered.filter(d => d.sport === sportFilter);
        }

        // EV filter
        const evFilter = parseFloat(document.getElementById('evFilter').value);
        if (!isNaN(evFilter)) {
            filtered = filtered.filter(d => d.ev && d.ev >= evFilter);
        }

        // Live filter
        const liveFilter = document.getElementById('liveFilter').value;
        if (liveFilter !== '') {
            const isLive = liveFilter === 'true';
            filtered = filtered.filter(d => d.live === isLive);
        }

        // Search filter
        const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
        if (searchFilter) {
            filtered = filtered.filter(d => 
                (d.game_name && d.game_name.toLowerCase().includes(searchFilter)) ||
                (d.home_team && d.home_team.toLowerCase().includes(searchFilter)) ||
                (d.away_team && d.away_team.toLowerCase().includes(searchFilter)) ||
                (d.player_1 && d.player_1.toLowerCase().includes(searchFilter)) ||
                (d.player_2 && d.player_2.toLowerCase().includes(searchFilter)) ||
                (d.display_name && d.display_name.toLowerCase().includes(searchFilter))
            );
        }

        this.filteredData = filtered;
        this.renderTable();
        this.updateCounts();
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        
        if (this.filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" class="no-data">No data matches current filters</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredData.map(record => `
            <tr class="${record.deeplink ? 'clickable' : ''}" data-link="${record.deeplink || ''}">
                <td>
                    <span class="live-indicator ${record.live ? 'live' : 'prematch'}"></span>
                    ${record.live ? 'LIVE' : 'Pre'}
                </td>
                <td>${record.book || '-'}</td>
                <td>${this.formatGameName(record)}</td>
                <td>${record.display_name || record.market_type || '-'}</td>
                <td class="${record.ev > 0 ? 'ev-positive' : 'ev-negative'}">
                    ${record.ev ? (record.ev * 100).toFixed(2) + '%' : '-'}
                </td>
                <td>${record.american_odds || '-'}</td>
                <td>${record.true_prob ? (record.true_prob * 100).toFixed(1) + '%' : '-'}</td>
                <td>${record.spread || '-'}</td>
                <td>${record.sport || '-'}</td>
                <td>${record.league || '-'}</td>
                <td>
                    ${record.deeplink ? `<span class="deeplink" onclick="event.stopPropagation();">Bet</span>` : '-'}
                </td>
                <td>${record.last_ts ? new Date(record.last_ts * 1000).toLocaleTimeString() : '-'}</td>
            </tr>
        `).join('');

        // Add click handlers for clickable rows
        tbody.querySelectorAll('tr.clickable').forEach(row => {
            row.addEventListener('click', (e) => {
                const link = row.dataset.link;
                if (link) {
                    window.open(link, '_blank');
                }
            });
        });
    }

    formatGameName(record) {
        if (record.game_name) return record.game_name;
        if (record.home_team && record.away_team) return `${record.away_team} @ ${record.home_team}`;
        if (record.player_1 && record.player_2) return `${record.player_1} vs ${record.player_2}`;
        return '-';
    }

    updateCounts() {
        const totalRecords = this.filteredData.length;
        const liveCount = this.filteredData.filter(d => d.live).length;
        const prematchCount = totalRecords - liveCount;

        document.getElementById('totalRecords').textContent = totalRecords;
        document.getElementById('liveCount').textContent = liveCount;
        document.getElementById('prematchCount').textContent = prematchCount;
    }

    showError(message) {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = `<tr><td colspan="12" class="error-message">${message}</td></tr>`;
    }

    // Utility method to handle CORS issues
    async fetchWithFallback(url, options = {}) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            console.warn(`Direct fetch failed for ${url}, attempting with CORS proxy...`);
            // Fallback to CORS proxy if available
            const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
            return await fetch(proxyUrl, {
                ...options,
                headers: {
                    ...options.headers,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
        }
    }

    // Method to export data as CSV
    exportToCSV() {
        if (this.filteredData.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = [
            'Status', 'Book', 'Game', 'Market', 'EV %', 'Odds', 
            'True Prob', 'Spread', 'Sport', 'League', 'Updated'
        ];

        const csvContent = [
            headers.join(','),
            ...this.filteredData.map(record => [
                record.live ? 'LIVE' : 'Pre',
                record.book || '',
                this.formatGameName(record).replace(/,/g, ';'),
                (record.display_name || record.market_type || '').replace(/,/g, ';'),
                record.ev ? (record.ev * 100).toFixed(2) + '%' : '',
                record.american_odds || '',
                record.true_prob ? (record.true_prob * 100).toFixed(1) + '%' : '',
                record.spread || '',
                record.sport || '',
                record.league || '',
                record.last_ts ? new Date(record.last_ts * 1000).toLocaleString() : ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `betting_data_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // Method to handle window visibility changes (pause when tab is hidden)
    handleVisibilityChange() {
        if (document.hidden) {
            this.stopAutoRefresh();
            this.updateStatus('Paused (tab hidden)', 'paused');
        } else if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
            this.updateStatus('Resumed', 'success');
            this.fetchData(); // Immediate refresh when tab becomes visible
        }
    }

    // Cleanup method
    destroy() {
        this.stopAutoRefresh();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
}

// Initialize the dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new BettingDataScraper();
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        dashboard.handleVisibilityChange();
    });

    // Add export button functionality
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📊 Export CSV';
    exportBtn.className = 'filter-input';
    exportBtn.style.background = '#2ecc71';
    exportBtn.style.color = 'white';
    exportBtn.style.border = 'none';
    exportBtn.style.cursor = 'pointer';
    exportBtn.onclick = () => dashboard.exportToCSV();
    
    const controls = document.querySelector('.controls');
    const exportGroup = document.createElement('div');
    exportGroup.className = 'filter-group';
    exportGroup.appendChild(exportBtn);
    controls.appendChild(exportGroup);

    // Add manual refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄 Refresh Now';
    refreshBtn.className = 'filter-input';
    refreshBtn.style.background = '#3498db';
    refreshBtn.style.color = 'white';
    refreshBtn.style.border = 'none';
    refreshBtn.style.cursor = 'pointer';
    refreshBtn.onclick = () => {
        if (!dashboard.isLoading) {
            dashboard.fetchData();
        }
    };
    
    const refreshGroup = document.createElement('div');
    refreshGroup.className = 'filter-group';
    refreshGroup.appendChild(refreshBtn);
    controls.appendChild(refreshGroup);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        dashboard.destroy();
    });
});

// Handle deeplink clicks
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('deeplink')) {
        const row = e.target.closest('tr');
        const link = row.dataset.link;
        if (link) {
            window.open(link, '_blank');
        }
    }
});