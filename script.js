class BettingDataScraper {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.refreshInterval = null;
        this.isLoading = false;
        this.refreshIntervalTime = 12000;
        this.autoRefreshEnabled = false;
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
    // Add null checks to prevent errors
    const toggleFilters = document.getElementById('toggleFilters');
    const toggleView = document.getElementById('toggleView');
    const filterControls = document.getElementById('filterControls');
    const desktopTable = document.getElementById('dataTable');
    const mobileCards = document.getElementById('mobileCards');
    
    // Check if all required elements exist
    if (!toggleFilters || !toggleView || !filterControls || !desktopTable || !mobileCards) {
        console.error('Required mobile elements not found:', {
            toggleFilters: !!toggleFilters,
            toggleView: !!toggleView,
            filterControls: !!filterControls,
            desktopTable: !!desktopTable,
            mobileCards: !!mobileCards
        });
        return;
    }
    
    // Initialize mobile view state
    let isMobileView = window.innerWidth <= 768;
    
    // Toggle filters visibility
    toggleFilters.addEventListener('click', () => {
        const isVisible = filterControls.style.display === 'flex';
        filterControls.style.display = isVisible ? 'none' : 'flex';
        toggleFilters.classList.toggle('active', !isVisible);
    });
    
    // Toggle between desktop and mobile view
    toggleView.addEventListener('click', () => {
        isMobileView = !isMobileView;
        
        if (isMobileView) {
            // Show mobile view
            desktopTable.style.display = 'none';
            mobileCards.style.display = 'flex';
            toggleView.textContent = '🖥️ Desktop';
            toggleView.classList.add('active');
        } else {
            // Show desktop view
            desktopTable.style.display = 'table';
            mobileCards.style.display = 'none';
            toggleView.textContent = '📱 Mobile';
            toggleView.classList.remove('active');
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const windowWidth = window.innerWidth;
        
        if (windowWidth <= 768) {
            // Force mobile view on small screens
            if (!isMobileView) {
                isMobileView = true;
                desktopTable.style.display = 'none';
                mobileCards.style.display = 'flex';
                toggleView.textContent = '🖥️ Desktop';
                toggleView.classList.add('active');
            }
        } else {
            // Auto-switch to desktop view on large screens if not manually overridden
            if (isMobileView && windowWidth > 1024) {
                isMobileView = false;
                desktopTable.style.display = 'table';
                mobileCards.style.display = 'none';
                toggleView.textContent = '📱 Mobile';
                toggleView.classList.remove('active');
            }
        }
    });
    
    // Initial setup based on screen size
    if (isMobileView) {
        desktopTable.style.display = 'none';
        mobileCards.style.display = 'flex';
        toggleView.textContent = '🖥️ Desktop';
        toggleView.classList.add('active');
    } else {
        desktopTable.style.display = 'table';
        mobileCards.style.display = 'none';
        toggleView.textContent = '📱 Mobile';
        toggleView.classList.remove('active');
    }
    
    // Initially hide filters on mobile
    if (window.innerWidth <= 768) {
        filterControls.style.display = 'none';
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
        if (this.autoRefreshEnabled && !this.isLoading) {
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
        
        // Stop auto refresh while loading
        this.stopAutoRefresh();

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
        
        // Restart auto refresh only after everything is complete
        if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
        }
    }

   openHistoricalChart(outcomeId, isLive, spread, record) {
    // Clean the outcome_id - remove _ALT suffix (case insensitive)
    const cleanOutcomeId = outcomeId.replace(/_alt$/i, '');
    
    // Get current timestamp
    const currentTimestamp = Date.now();
    
    // Build the URL
    let url = `https://49pzwry2rc.execute-api.us-east-1.amazonaws.com/prod/getHistoricalOdds?outcome_id=${cleanOutcomeId}&live=${isLive}&from=${currentTimestamp}`;
    
    console.log('Opening historical chart with URL:', url);
    
    // Prepare additional parameters to pass to the chart
    const chartParams = {
        api_url: url,
        game_name: encodeURIComponent(this.formatGameName(record)),
        market_name: encodeURIComponent(record.display_name || record.market_type || 'Unknown Market'),
        outcome_type: encodeURIComponent(record.outcome_type || 'Unknown Type'),
        ev_value: record.ev ? (record.ev * 100).toFixed(2) + '%' : 'N/A',
        book_name: encodeURIComponent(record.book || 'Unknown'),
        sport: encodeURIComponent(record.sport || 'Unknown'),
       
    };
    
    // Create URL with all parameters
    const paramString = Object.entries(chartParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    
    const templateUrl = `chart-template.html?${paramString}`;
    
    // Open in new window
    window.open(templateUrl, '_blank');
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
            } catch (error) {
                console.error(`AWS ${sport}数据错误:`, error);
            }
        }

        return allData;
    }

    async processData(openoddsData, cloudfrontData, awsData) {
        const processed = [];
        const gameInfoCache = new Map(); // Cache game info lookups

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

                        // Use cached game info if available
                        let gameInfo;
                        if (gameInfoCache.has(record.outcome_id)) {
                            gameInfo = gameInfoCache.get(record.outcome_id);
                        } else {
                            gameInfo = this.findGameInfo(record.outcome_id, cloudfrontData, awsData);
                            gameInfoCache.set(record.outcome_id, gameInfo);
                        }
                        
                        Object.assign(record, gameInfo);

                        if (record.outcome_id && !record._needsAdditionalLookup) {
                            processed.push(record);
                        }
                    } catch (error) {
                        console.error('Processing record error:', error);
                    }
                }
            }
        }

        return processed;
    }

    findGameInfo(outcomeId, cloudfrontData, awsData) {
        const info = {};
        
        for (const game of cloudfrontData) {
            if (game.markets) {
                for (const [marketId, market] of Object.entries(game.markets)) {
                    if (market.outcomes) {
                        for (const outcome of Object.values(market.outcomes)) {
                            // Strip _ALT suffix for matching
                            const cleanOutcomeId = outcome.outcome_id.replace(/_ALT$/, '');
                            const cleanSearchId = outcomeId.replace(/_ALT$/, '');
                            
                            if (outcome.outcome_id === outcomeId || cleanOutcomeId === cleanSearchId) {
                                info.market_id = marketId;
                                info.market_type = market.market_type;
                                info.display_name = market.display_name;
                                info.game_name = game.game_name;
                                info.home_team = game.home_team;
                                info.away_team = game.away_team;
                                info.sport = game.sport;
                                
                                info.player_1 = game.player_1;
                                info.player_2 = game.player_2;
                                info.outcome_type = outcome.outcome_type;
                                
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
                                    console.log(`✅ Found match in additional CloudFront call for ${outcomeId}`);
                                    
                                    return {
                                        market_id: marketId,
                                        market_type: market.market_type,
                                        display_name: market.display_name,
                                        game_name: game.game_name,
                                        home_team: game.home_team,
                                        away_team: game.away_team,
                                        sport: game.sport,
                                       
                                        player_1: game.player_1,
                                        player_2: game.player_2,
                                        outcome_type: outcome.outcome_type
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
    let filtered = this.data;

    // Filter by allowed sportsbooks only - FIRST ADD MORE HERE AS YOU SEARCH
    
    const allowedSportsbooks = ["DRAFTKINGS","FANDUEL","BETMGM","CAESARS","ESPN","HARDROCK","BALLYBET",,"BET365","FANATICS","NONE"];
    filtered = filtered.filter(d => allowedSportsbooks.includes(d.book));

    // Chain other filters for better performance
    const bookFilter = document.getElementById('bookFilter').value;
    const sportFilter = document.getElementById('sportFilter').value;
    const evFilterInput = document.getElementById('evFilter').value;
    const liveFilter = document.getElementById('liveFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
    
    if (bookFilter) {
        filtered = filtered.filter(d => d.book === bookFilter);
    }

    if (sportFilter) {
        filtered = filtered.filter(d => d.sport === sportFilter);
    }

    if (evFilterInput !== '' && !isNaN(evFilterInput)) {
        const evThreshold = parseFloat(evFilterInput) / 100;
        filtered = filtered.filter(d => d.ev && d.ev >= evThreshold);
    }

    if (liveFilter !== '') {
        const isLive = liveFilter === 'true';
        filtered = filtered.filter(d => d.live === isLive);
    }

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
            record.outcome_type || '',
            record.ev ? (record.ev * 100).toFixed(2) + '%' : '',
            record.american_odds || '',
            record.true_prob ? (record.true_prob * 100).toFixed(1) + '%' : '',
            record.spread || '',
            record.sport || '',
            
            record.deeplink ? 'Bet' : '',
            'Chart',
            this.formatTimestamp(record.last_ts)
        ];
        return values[colIndex] || '';
    }

    getSortValue(record, column) {
        switch (column) {
            case 'status': return record.live ? 1 : 0;
            case 'book': return record.book || '';
            case 'game': return this.formatGameName(record);
            case 'market': return record.display_name || record.market_type || '';
            case 'outcome_type': return record.outcome_type || '';
            case 'ev': return record.ev || -999;
            case 'odds': return parseInt(record.american_odds) || 0;
            case 'prob': return record.true_prob || 0;
            case 'spread': return parseFloat(record.spread) || 0;
            case 'sport': return record.sport || '';
           
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

    // Replace the renderTable method with this fixed version
renderTable() {
    const desktopTable = document.getElementById('dataTable');
    const mobileCards = document.getElementById('mobileCards');
    const columnFilterRow = document.querySelector('.column-filter-row');
    
    // Check which view is currently active based on display style
    const isMobileViewActive = mobileCards.style.display !== 'none' && 
                              desktopTable.style.display === 'none';
    
    // Hide/show column filter row based on view
    if (columnFilterRow) {
        columnFilterRow.style.display = isMobileViewActive ? 'none' : 'grid';
    }
    
    if (isMobileViewActive) {
        this.renderMobileCards();
    } else {
        this.renderDesktopTable();
    }
}

// Also update the setupMobileHandlers method to fix the initial state
setupMobileHandlers() {
    // Add null checks to prevent errors
    const toggleFilters = document.getElementById('toggleFilters');
    const toggleView = document.getElementById('toggleView');
    const filterControls = document.getElementById('filterControls');
    const desktopTable = document.getElementById('dataTable');
    const mobileCards = document.getElementById('mobileCards');
    
    // Check if all required elements exist
    if (!toggleFilters || !toggleView || !filterControls || !desktopTable || !mobileCards) {
        console.error('Required mobile elements not found:', {
            toggleFilters: !!toggleFilters,
            toggleView: !!toggleView,
            filterControls: !!filterControls,
            desktopTable: !!desktopTable,
            mobileCards: !!mobileCards
        });
        return;
    }
    
    // Initialize mobile view state based on screen size
    let isMobileView = window.innerWidth <= 768;
    
    // Toggle filters visibility
    toggleFilters.addEventListener('click', () => {
        const isVisible = filterControls.style.display === 'flex';
        filterControls.style.display = isVisible ? 'none' : 'flex';
        toggleFilters.classList.toggle('active', !isVisible);
    });
    
    // Toggle between desktop and mobile view
    toggleView.addEventListener('click', () => {
        isMobileView = !isMobileView;
        
        if (isMobileView) {
            // Show mobile view
            desktopTable.style.display = 'none';
            mobileCards.style.display = 'flex';
            toggleView.textContent = '🖥️ Desktop';
            toggleView.classList.add('active');
        } else {
            // Show desktop view
            desktopTable.style.display = 'table';
            mobileCards.style.display = 'none';
            toggleView.textContent = '📱 Mobile';
            toggleView.classList.remove('active');
        }
        
        // Re-render the table with the new view
        this.renderTable();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const windowWidth = window.innerWidth;
        
        if (windowWidth <= 768) {
            // Force mobile view on small screens
            if (!isMobileView) {
                isMobileView = true;
                desktopTable.style.display = 'none';
                mobileCards.style.display = 'flex';
                toggleView.textContent = '🖥️ Desktop';
                toggleView.classList.add('active');
                this.renderTable();
            }
        } else {
            // Auto-switch to desktop view on large screens if not manually overridden
            if (isMobileView && windowWidth > 1024) {
                isMobileView = false;
                desktopTable.style.display = 'table';
                mobileCards.style.display = 'none';
                toggleView.textContent = '📱 Mobile';
                toggleView.classList.remove('active');
                this.renderTable();
            }
        }
    });
    
    // Initial setup based on screen size
    if (isMobileView) {
        desktopTable.style.display = 'none';
        mobileCards.style.display = 'flex';
        toggleView.textContent = '🖥️ Desktop';
        toggleView.classList.add('active');
    } else {
        desktopTable.style.display = 'table';
        mobileCards.style.display = 'none';
        toggleView.textContent = '📱 Mobile';
        toggleView.classList.remove('active');
    }
    
    // Initially hide filters on mobile
    if (window.innerWidth <= 768) {
        filterControls.style.display = 'none';
    }
}

 // Add this helper function to map book names to logos
getBookLogo(bookName) {
    const logoMap = {
        'DRAFTKINGS': 'logos/draftkings-logo.png',
        'FANDUEL': 'logos/fanduel-logo.png', 
        'BETMGM': 'logos/betmgm-logo.png',
        'CAESARS': 'logos/caesars-logo.png',
        'ESPN': 'logos/espn-bet-logo.jpeg',
        'HARDROCK': 'logos/hardrock-logo.jpg',
        'BALLYBET': 'logos/ballybet-logo.png', // You'll need to add this
        'BETONLINE': 'logos/betonline-logo.png', // You'll need to add this
        'BET365': 'logos/bet365-logo.png',
        'FANATICS': 'logos/fanatics-logo.png', // You'll need to add this
        'FLIFF': 'logos/fliff-logo.png' // You'll need to add this
    };
    
    const normalizedBook = bookName ? bookName.toUpperCase() : '';
    return logoMap[normalizedBook] || null;
}

renderDesktopTable() {
    const tbody = document.getElementById('tableBody');
    
    if (this.filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="no-data">No data matches current filters</td></tr>';
        return;
    }

    tbody.innerHTML = this.filteredData.map((record, index) => `
        <tr>
            <td>
                <span class="live-indicator ${record.live ? 'live' : 'prematch'}"></span>
                <span>${record.live ? 'LIVE' : 'Pre'}</span>
            </td>
            <td>
                ${this.getBookLogo(record.book) ? 
                    `<img src="${this.getBookLogo(record.book)}" 
                         alt="${record.book || 'Unknown'}" 
                         style="width: 32px; height: 32px; object-fit: contain;"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                     <span style="display: none;">${record.book || 'Unknown'}</span>` 
                    : (record.book || 'Unknown')
                }
            </td>
            <td>${this.formatGameName(record)}</td>
            <td>${record.display_name || record.market_type || ''}</td>
            <td>${record.outcome_type || ''}</td>
            <td class="${record.ev > 0 ? 'ev-positive' : 'ev-negative'}">
                ${record.ev ? (record.ev * 100).toFixed(2) + '%' : ''}
            </td>
            <td>${record.american_odds || ''}</td>
            <td class="mobile-hide">${record.true_prob ? (record.true_prob * 100).toFixed(1) + '%' : ''}</td>
            <td class="mobile-hide">${record.spread || ''}</td>
            <td class="mobile-hide">${record.sport || ''}</td>
            <td class="mobile-hide">
                ${record.deeplink && this.getBookLogo(record.book) ? 
                    `<button class="deeplink" onclick="window.open('${record.deeplink}', '_blank')">
                        <img src="${this.getBookLogo(record.book)}" 
                             alt="${record.book}" 
                             style="width: 24px; height: 24px; object-fit: contain;">
                     </button>` 
                    : (record.deeplink ? `<button class="deeplink" onclick="window.open('${record.deeplink}', '_blank')">${record.book || 'Bet'}</button>` : '')
                }
            </td>
            <td class="mobile-hide">
                <button class="chart-btn" onclick="dashboard.openHistoricalChart('${record.outcome_id}', ${record.live}, '${record.spread || ''}', dashboard.filteredData[${index}])">📊</button>
            </td>
            <td class="mobile-hide">${this.formatTimestamp(record.last_ts)}</td>
        </tr>
    `).join('');

    // Remove the click handlers for rows since we only want button clicks to work
    // No additional event listeners needed - buttons handle their own clicks
}

// Updated renderMobileCards function - remove clickable class and click handlers
renderMobileCards() {
    const container = document.getElementById('mobileCards');
    
    if (this.filteredData.length === 0) {
        container.innerHTML = '<div class="no-data-card">No data matches filters</div>';
        return;
    }
    
    container.innerHTML = this.filteredData.map((record, index) => `
        <div class="two-column-card">
            <div class="left-column">
                <div class="game-two-col">${this.formatGameName(record)}</div>
                <div class="market-two-col">${record.display_name || record.market_type || 'Unknown Market'}</div>
                <div class="outcome-two-col">${record.outcome_type || 'Unknown Type'}</div>
                <div class="meta-two-col">
                    <span class="book-logo-container">
                        ${this.getBookLogo(record.book) ? 
                            `<img src="${this.getBookLogo(record.book)}" 
                                 alt="${record.book || 'Unknown'}" 
                                 style="width: 24px; height: 24px; object-fit: contain; vertical-align: middle;"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                             <span style="display: none;">${record.book || 'Unknown'}</span>` 
                            : (record.book || 'Unknown')
                        }
                    </span>
                    <span class="separator">•</span>
                    <span class="sport-two-col">${record.sport || 'N/A'}</span>
                    <span class="separator">•</span>
                    <span class="live-status-two-col ${record.live ? 'live' : 'prematch'}">
                        ${record.live ? 'LIVE' : 'PRE'}
                    </span>
                </div>
                <div class="time-two-col">${this.formatTimestamp(record.last_ts)}</div>
            </div>
            <div class="right-column">
                <div class="ev-two-col ${record.ev > 0 ? 'ev-positive' : 'ev-negative'}">
                    ${record.ev ? (record.ev * 100).toFixed(1) + '%' : 'N/A'}
                </div>
                <div class="odds-two-col">${record.american_odds || 'N/A'}</div>
                <div class="actions-two-col">
                    <button class="btn-two-col chart-btn-two-col" onclick="dashboard.openHistoricalChart('${record.outcome_id}', ${record.live}, '${record.spread || ''}', dashboard.filteredData[${index}])">
                        📊
                    </button>
                    ${record.deeplink ? 
                        (this.getBookLogo(record.book) ? 
                            `<button class="btn-two-col bet-btn-two-col" onclick="window.open('${record.deeplink}', '_blank')">
                                <img src="${this.getBookLogo(record.book)}" 
                                     alt="${record.book}" 
                                     style="width: 20px; height: 20px; object-fit: contain;">
                             </button>` 
                            : `<button class="btn-two-col bet-btn-two-col" onclick="window.open('${record.deeplink}', '_blank')">${record.book || 'Bet'}</button>`
                        ) : ''
                    }
                </div>
            </div>
        </div>
    `).join('');

    // Removed all click handlers - only buttons are clickable now
}
    // 1. Update the formatGameName function (replace the existing one)
formatGameName(record) {
    // Priority: Use player names if available, otherwise use team names
    const home = record.player_1 || record.home_team;
    const away = record.player_2 || record.away_team;
    
    if (home && away) {
        return `${home} vs ${away}`;
    }
    
    // Fallback to game_name if available
    if (record.game_name) return record.game_name;
    
    console.log(`⚠️ Unknown Game for outcome_id: ${record.outcome_id}`, {
        game_name: record.game_name,
        home_team: record.home_team,
        away_team: record.away_team,
        player_1: record.player_1,
        player_2: record.player_2,
        sport: record.sport,
      
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

    // 7. Update the exportToCSV function to include outcome_type
exportToCSV() {
    if (this.filteredData.length === 0) {
        alert('No data to export');
        return;
    }

    const headers = [
        'Status', 'Book', 'Game', 'Market', 'Outcome Type', 'EV %', 'Odds', 
        'True Prob', 'Spread', 'Sport',  'Updated (EST)'
    ];

    const csvContent = [
        headers.join(','),
        ...this.filteredData.map(record => [
            record.live ? 'LIVE' : 'Pre',
            record.book || '',
            this.formatGameName(record).replace(/,/g, ';'),
            (record.display_name || record.market_type || '').replace(/,/g, ';'),
            record.outcome_type || '',
            record.ev ? (record.ev * 100).toFixed(2) + '%' : '',
            record.american_odds || '',
            record.true_prob ? (record.true_prob * 100).toFixed(1) + '%' : '',
            record.spread || '',
            record.sport || '',
            
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
