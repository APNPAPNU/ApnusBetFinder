class BettingDataScraper {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.refreshInterval = null;
        this.isLoading = false;
        this.refreshIntervalTime = 3000;
        this.autoRefreshEnabled = true;
        this.isMobileView = window.innerWidth <= 768;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.columnFilters = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMobileHandlers();
        this.setupColumnFilters();
        this.setupSorting();
        this.startAutoRefresh();
        this.fetchData();
    }

    setupEventListeners() {
        // 原有过滤器
        ['bookFilter', 'sportFilter', 'evFilter', 'liveFilter', 'searchFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.applyFilters());
            document.getElementById(id).addEventListener('input', () => this.applyFilters());
        });

        // 刷新控制
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
                this.startAutoRefresh();
            }
        });

        // 窗口大小变化
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobileView;
            this.isMobileView = window.innerWidth <= 768;
            if (wasMobile !== this.isMobileView) {
                this.renderTable();
            }
        });
    }

    setupMobileHandlers() {
        // 过滤器切换
        document.getElementById('toggleFilters').addEventListener('click', () => {
            const controls = document.getElementById('filterControls');
            const columnFilters = document.getElementById('columnFilters');
            const isHidden = controls.style.display === 'none';
            
            controls.style.display = isHidden ? 'flex' : 'none';
            columnFilters.style.display = isHidden ? 'block' : 'none';
        });

        // 视图切换
        document.getElementById('toggleView').addEventListener('click', () => {
            const table = document.getElementById('dataTable');
            const cards = document.getElementById('mobileCards');
            const isTableVisible = table.style.display !== 'none';
            
            table.style.display = isTableVisible ? 'none' : 'table';
            cards.style.display = isTableVisible ? 'block' : 'none';
        });

        // 初始移动端状态
        if (this.isMobileView) {
            document.getElementById('filterControls').style.display = 'none';
            document.getElementById('columnFilters').style.display = 'none';
        }
    }

    setupColumnFilters() {
        const columnInputs = document.querySelectorAll('.column-filter-input');
        columnInputs.forEach((input, index) => {
            if (!input.disabled) {
                input.addEventListener('input', (e) => {
                    this.columnFilters[index] = e.target.value.toLowerCase();
                    this.applyFilters();
                });
            }
        });
    }

    setupSorting() {
        const headers = document.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                if (this.sortColumn === column) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = column;
                    this.sortDirection = 'asc';
                }
                this.updateSortIndicators();
                this.applyFilters();
            });
        });
    }

    updateSortIndicators() {
        document.querySelectorAll('.sort-indicator').forEach(indicator => {
            indicator.textContent = '';
        });
        
        if (this.sortColumn) {
            const header = document.querySelector(`th[data-sort="${this.sortColumn}"] .sort-indicator`);
            if (header) {
                header.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
            }
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
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
            const [openoddsData, cloudfrontData, awsData] = await Promise.all([
                this.fetchOpenOddsData(),
                this.fetchCloudfrontData(),
                this.fetchAWSData()
            ]);

            this.data = await this.processData(openoddsData, cloudfrontData, awsData);
            this.updateFilterOptions();
            this.applyFilters();
            
            this.updateStatus(`Data updated`, 'success');
            document.getElementById('lastUpdate').textContent = `Last: ${this.formatTimestampEST(new Date())}`;
            
        } catch (error) {
            console.error('获取数据错误:', error);
            this.updateStatus('Error fetching data', 'error');
            this.showError('Failed to fetch betting data.');
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

            liveData.forEach(item => item._is_live = true);
            prematchData.forEach(item => item._is_live = false);

            return [...liveData, ...prematchData];
        } catch (error) {
            console.error('OpenOdds数据错误:', error);
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
            console.error('Cloudfront数据错误:', error);
            return [];
        }
    }

    async fetchAWSData() {
        const sports = ["basketball", "baseball", "football", "soccer", "hockey","tennis"];
        let allData = {};

        for (const sport of sports) {
            try {
                const response = await fetch(`https://49pzwry2rc.execute-api.us-east-1.amazonaws.com/prod/getLiveGames?sport=${sport}&live=false`);
                if (response.ok) {
                    const data = await response.json();
                    const games = data.body || data;
                    Object.assign(allData, games);
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`AWS ${sport}数据错误:`, error);
            }
        }

        return allData;
    }

    async processData(openoddsData, cloudfrontData, awsData) {
    const processed = [];
    const unknownGames = [];

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

                    const gameInfo = this.findGameInfo(record.outcome_id, cloudfrontData, awsData);
                    Object.assign(record, gameInfo);

                    if (record.outcome_id) {
                        if (record._needsAdditionalLookup) {
                            unknownGames.push(record);
                        } else {
                            processed.push(record);
                        }
                    }
                } catch (error) {
                    console.error('处理记录错误:', error);
                }
            }
        }
    }

    // Handle unknown games with additional API call
    if (unknownGames.length > 0) {
        for (const record of unknownGames) {
            const additionalInfo = await this.findGameInfoFromCloudfront(record.outcome_id);
            Object.assign(record, additionalInfo);
            delete record._needsAdditionalLookup;
            processed.push(record);
        }
    }

    return processed;
}

    findGameInfo(outcomeId, cloudfrontData, awsData) {
    const info = {};
    
    console.log(`🔍 Looking for outcome_id: ${outcomeId} in cloudfrontData`);
    
    for (const game of cloudfrontData) {
        if (game.markets) {
            for (const [marketId, market] of Object.entries(game.markets)) {
                if (market.outcomes) {
                    for (const outcome of Object.values(market.outcomes)) {
    // Strip _ALT suffix for matching
    const cleanOutcomeId = outcome.outcome_id.replace(/_ALT$/, '');
    const cleanSearchId = outcomeId.replace(/_ALT$/, '');
    
    if (outcome.outcome_id === outcomeId || cleanOutcomeId === cleanSearchId) {
        console.log(`✅ Found match in cloudfrontData for ${outcomeId}:`, {
            original_outcome_id: outcome.outcome_id,
            searched_outcome_id: outcomeId,
            game_name: game.game_name,
            market_display_name: market.display_name,
            outcome_display_name: outcome.display_name
        });
        
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
    
    console.log(`❌ No match found in cloudfrontData for outcome_id: ${outcomeId}`);
    
    // If not found, mark for additional lookup
    info._needsAdditionalLookup = true;
    info.outcome_id = outcomeId;
    return info;
}
async findGameInfoFromCloudfront(outcomeId) {
    try {
        console.log(`🔍 Making additional CloudFront call for outcome_id: ${outcomeId}`);
        
        const response = await fetch('https://d6ailk8q6o27n.cloudfront.net/livegames');
        if (!response.ok) {
            console.log(`❌ CloudFront API call failed with status: ${response.status}`);
            return {};
        }
        
        const data = await response.json();
        const allGames = [];
        
        if (data.body) {
            if (data.body.prematch_games) allGames.push(...data.body.prematch_games);
            if (data.body.live_games) allGames.push(...data.body.live_games);
        }
        
        console.log(`📊 Checking ${allGames.length} games from additional CloudFront call`);
        
        for (const game of allGames) {
            if (game.markets) {
                for (const [marketId, market] of Object.entries(game.markets)) {
                    if (market.outcomes) {
                        for (const outcome of Object.values(market.outcomes)) {
    if (outcome.outcome_id === outcomeId) {
        console.log(`✅ Found match in additional CloudFront call for ${outcomeId}:`, {
            // ... existing logging
        });
                                
                                return {
                                    market_id: marketId,
                                    market_type: market.market_type,
                                    display_name: market.display_name,
                                    game_name: game.game_name,
                                    home_team: game.home_team,
                                    away_team: game.away_team,
                                    sport: game.sport,
                                    league: game.league,
                                    player_1: game.player_1,
                                    player_2: game.player_2
                                };
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`❌ Still no match found in additional CloudFront call for outcome_id: ${outcomeId}`);
        return {};
    } catch (error) {
        console.error('Error fetching additional game info:', error);
        return {};
    }
}
    updateFilterOptions() {
        const books = [...new Set(this.data.map(d => d.book).filter(Boolean))].sort();
        this.updateSelectOptions('bookFilter', books);

        const sports = [...new Set(this.data.map(d => d.sport).filter(Boolean))].sort();
        this.updateSelectOptions('sportFilter', sports);
    }

    updateSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
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

        // Original filters
        const bookFilter = document.getElementById('bookFilter').value;
        if (bookFilter) {
            filtered = filtered.filter(d => d.book === bookFilter);
        }

        const sportFilter = document.getElementById('sportFilter').value;
        if (sportFilter) {
            filtered = filtered.filter(d => d.sport === sportFilter);
        }

        // FIXED EV Filter - convert percentage input to decimal for comparison
        const evFilterInput = document.getElementById('evFilter').value;
        if (evFilterInput !== '' && !isNaN(evFilterInput)) {
            const evThreshold = parseFloat(evFilterInput) / 100; // Convert percentage to decimal
            filtered = filtered.filter(d => d.ev && d.ev >= evThreshold);
        }

        const liveFilter = document.getElementById('liveFilter').value;
        if (liveFilter !== '') {
            const isLive = liveFilter === 'true';
            filtered = filtered.filter(d => d.live === isLive);
        }

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

        // Column filters
        Object.entries(this.columnFilters).forEach(([colIndex, filterValue]) => {
            if (filterValue) {
                filtered = filtered.filter(record => {
                    const cellValue = this.getCellValue(record, parseInt(colIndex));
                    return cellValue.toLowerCase().includes(filterValue);
                });
            }
        });

        // Sorting
        if (this.sortColumn) {
            filtered.sort((a, b) => {
                const aVal = this.getSortValue(a, this.sortColumn);
                const bVal = this.getSortValue(b, this.sortColumn);
                
                let result = 0;
                if (aVal < bVal) result = -1;
                else if (aVal > bVal) result = 1;
                
                return this.sortDirection === 'desc' ? -result : result;
            });
        }

        this.filteredData = filtered;
        this.renderTable();
        this.updateCounts();
    }

    getCellValue(record, colIndex) {
        const values = [
            record.live ? 'LIVE' : 'Pre',
            record.book || '',
            this.formatGameName(record),
            record.display_name || record.market_type || '',
            record.ev ? (record.ev * 100).toFixed(2) + '%' : '',
            record.american_odds || '',
            record.true_prob ? (record.true_prob * 100).toFixed(1) + '%' : '',
            record.spread || '',
            record.sport || '',
            record.league || '',
            record.deeplink ? 'Bet' : '',
            this.formatTimestamp(record.last_ts) // Using EST formatting
        ];
        return values[colIndex] || '';
    }

    getSortValue(record, column) {
        switch (column) {
            case 'status': return record.live ? 1 : 0;
            case 'book': return record.book || '';
            case 'game': return this.formatGameName(record);
            case 'market': return record.display_name || record.market_type || '';
            case 'ev': return record.ev || -999;
            case 'odds': return parseInt(record.american_odds) || 0;
            case 'prob': return record.true_prob || 0;
            case 'spread': return parseFloat(record.spread) || 0;
            case 'sport': return record.sport || '';
            case 'league': return record.league || '';
            case 'time': return this.getTimestampValue(record.last_ts);
            default: return '';
        }
    }

    // Helper method to convert UTC to Eastern Time and format for display
    formatTimestamp(timestamp) {
        if (!timestamp) return '-';
        
        try {
            let date;
            // Check if it's an ISO string or Unix timestamp
            if (typeof timestamp === 'string' && timestamp.includes('T')) {
                // ISO string format like "2025-07-03T00:06:05.732861"
                date = new Date(timestamp);
            } else if (typeof timestamp === 'number') {
                // Unix timestamp (seconds)
                date = new Date(timestamp * 1000);
            } else {
                return '-';
            }
            
            if (isNaN(date.getTime())) return '-';
            
            // Convert to Eastern Time (EST/EDT)
            return this.formatTimestampEST(date);
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return '-';
        }
    }

    // Helper method to format timestamp in Eastern Time
  formatTimestampEST(date) {
    try {
        // Subtract 4 hours (4 * 60 * 60 * 1000 milliseconds)
        const adjustedDate = new Date(date.getTime() - 4 * 60 * 60 * 1000);

        return adjustedDate.toLocaleTimeString('en-US', {
            timeZone: 'America/New_York',
            hour12: true,
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

    // Helper method to get timestamp value for sorting (keep as UTC milliseconds)
    getTimestampValue(timestamp) {
        if (!timestamp) return 0;
        
        try {
            if (typeof timestamp === 'string' && timestamp.includes('T')) {
                // ISO string format
                return new Date(timestamp).getTime();
            } else if (typeof timestamp === 'number') {
                // Unix timestamp
                return timestamp * 1000;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    renderTable() {
        if (this.isMobileView && document.getElementById('mobileCards').style.display !== 'none') {
            this.renderMobileCards();
        } else {
            this.renderDesktopTable();
        }
    }

    renderDesktopTable() {
        const tbody = document.getElementById('tableBody');
        
        if (this.filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" class="no-data">No data matches filters</td></tr>';
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
                <td>${this.formatTimestamp(record.last_ts)}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('tr.clickable').forEach(row => {
            row.addEventListener('click', (e) => {
                const link = row.dataset.link;
                if (link) window.open(link, '_blank');
            });
        });
    }

    renderMobileCards() {
        const container = document.getElementById('mobileCards');
        
        if (this.filteredData.length === 0) {
            container.innerHTML = '<div class="no-data-card">No data matches filters</div>';
            return;
        }

        container.innerHTML = this.filteredData.map(record => `
            <div class="betting-card ${record.deeplink ? 'clickable' : ''}" data-link="${record.deeplink || ''}">
                <div class="card-header">
                    <div class="card-status">
                        <span class="live-indicator ${record.live ? 'live' : 'prematch'}"></span>
                        <span class="status-text">${record.live ? 'LIVE' : 'Pre'}</span>
                    </div>
                    <div class="card-book">${record.book || 'Unknown'}</div>
                </div>
                <div class="card-game">${this.formatGameName(record)}</div>
                <div class="card-market">${record.display_name || record.market_type || 'Unknown Market'}</div>
                <div class="card-stats">
                    <div class="stat-item">
                        <span class="stat-label">EV</span>
                        <span class="stat-value ${record.ev > 0 ? 'ev-positive' : 'ev-negative'}">
                            ${record.ev ? (record.ev * 100).toFixed(2) + '%' : 'N/A'}
                        </span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Odds</span>
                        <span class="stat-value">${record.american_odds || 'N/A'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sport</span>
                        <span class="stat-value">${record.sport || 'N/A'}</span>
                    </div>
                </div>
                <div class="card-time">${this.formatTimestamp(record.last_ts)}</div>
                ${record.deeplink ? '<div class="card-bet-button">🎯 Place Bet</div>' : ''}
            </div>
        `).join('');

        container.querySelectorAll('.betting-card.clickable').forEach(card => {
            card.addEventListener('click', () => {
                const link = card.dataset.link;
                if (link) window.open(link, '_blank');
            });
        });
    }

    formatGameName(record) {
    if (record.game_name) return record.game_name;
    if (record.home_team && record.away_team) return `${record.away_team} @ ${record.home_team}`;
    if (record.player_1 && record.player_2) return `${record.player_1} vs ${record.player_2}`;
    
    console.log(`⚠️ Unknown Game for outcome_id: ${record.outcome_id}`, {
        game_name: record.game_name,
        home_team: record.home_team,
        away_team: record.away_team,
        player_1: record.player_1,
        player_2: record.player_2,
        sport: record.sport,
        league: record.league,
        display_name: record.display_name,
        market_type: record.market_type
    });
    
    return 'Unknown Game';
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
        
        const mobileCards = document.getElementById('mobileCards');
        mobileCards.innerHTML = `<div class="error-card">${message}</div>`;
    }

    exportToCSV() {
        if (this.filteredData.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = [
            'Status', 'Book', 'Game', 'Market', 'EV %', 'Odds', 
            'True Prob', 'Spread', 'Sport', 'League', 'Updated (EST)'
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
                this.formatTimestamp(record.last_ts)
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

    handleVisibilityChange() {
        if (document.hidden) {
            this.stopAutoRefresh();
            this.updateStatus('Paused (hidden)', 'paused');
        } else if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
            this.updateStatus('Resumed', 'success');
            this.fetchData();
        }
    }

    destroy() {
        this.stopAutoRefresh();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
}

// 初始化
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new BettingDataScraper();
    
    document.addEventListener('visibilitychange', () => {
        dashboard.handleVisibilityChange();
    });

    // 导出按钮
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📊 Export';
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

    // 手动刷新按钮
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄 Refresh';
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

    window.addEventListener('beforeunload', () => {
        dashboard.destroy();
    });
});

// Deeplink处理
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('deeplink')) {
        const row = e.target.closest('tr');
        const link = row.dataset.link;
        if (link) {
            window.open(link, '_blank');
        }
    }
});
