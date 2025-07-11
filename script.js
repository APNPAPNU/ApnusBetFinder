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
// Add these methods to your BettingDataScraper class

// Method to find arbitrage opportunities
// REPLACE your existing findArbitrageOpportunities method with this enhanced version

// REPLACE your existing findArbitrageOpportunities method with this FIXED version

// REPLACE your existing findArbitrageOpportunities method with this FIXED version

// REPLACE your existing findArbitrageOpportunities method with this FIXED version

findArbitrageOpportunities(data) {
    console.log('🔍 Starting arbitrage analysis...');
    console.log(`📊 Total records to analyze: ${data.length}`);
    
    const arbitrageOpportunities = [];
    const marketGroups = {};
    
    // Group by TRUE market (game + market_type + spread combination)
    // NOT by outcome_id since different outcomes have different outcome_ids
    data.forEach(record => {
        // Create a market key based on the actual market, not outcome_id
        const gameKey = this.formatGameName(record);
        const marketType = record.display_name || record.market_type || 'Unknown';
        const spreadKey = record.spread || 'no-spread';
        
        // This groups the same market together regardless of outcome type
        const marketKey = `${gameKey}_${marketType}_${spreadKey}`;
        
        if (!marketGroups[marketKey]) {
            marketGroups[marketKey] = {
                game_name: gameKey,
                display_name: marketType,
                spread: record.spread,
                sport: record.sport,
                live: record.live,
                outcomes: {}
            };
        }
        
        // Group by outcome_type within the market
        if (!marketGroups[marketKey].outcomes[record.outcome_type]) {
            marketGroups[marketKey].outcomes[record.outcome_type] = [];
        }
        
        marketGroups[marketKey].outcomes[record.outcome_type].push(record);
    });
    
    console.log(`🎯 Found ${Object.keys(marketGroups).length} unique markets`);
    
    // Analyze each market for arbitrage
    Object.entries(marketGroups).forEach(([marketKey, market]) => {
        const outcomeTypes = Object.keys(market.outcomes);
        console.log(`\n🏟️ Market: ${market.game_name} - ${market.display_name}`);
        console.log(`📈 Outcome types: ${outcomeTypes.join(', ')}`);
        
        // Need at least 2 different outcome types for arbitrage
        if (outcomeTypes.length >= 2) {
            console.log(`✅ Market has ${outcomeTypes.length} outcomes - checking for arbitrage`);
            
            // Find best odds for each outcome type
            const bestOdds = {};
            outcomeTypes.forEach(outcomeType => {
                const outcomes = market.outcomes[outcomeType];
                console.log(`  📋 ${outcomeType}: ${outcomes.length} books available`);
                
                let bestOutcome = null;
                let bestImpliedProb = 1;
                
                outcomes.forEach(outcome => {
                    if (outcome.american_odds) {
                        const impliedProb = this.americanOddsToImpliedProbability(outcome.american_odds);
                        console.log(`    🏪 ${outcome.book}: ${outcome.american_odds} (${(impliedProb * 100).toFixed(2)}%)`);
                        
                        if (impliedProb < bestImpliedProb) {
                            bestImpliedProb = impliedProb;
                            bestOutcome = outcome;
                        }
                    } else {
                        console.log(`    ❌ ${outcome.book}: No odds available`);
                    }
                });
                
                if (bestOutcome) {
                    bestOdds[outcomeType] = {
                        outcome: bestOutcome,
                        impliedProb: bestImpliedProb
                    };
                    console.log(`    🎯 Best: ${bestOutcome.book} at ${bestOutcome.american_odds} (${(bestImpliedProb * 100).toFixed(2)}%)`);
                } else {
                    console.log(`    ❌ No valid odds found for ${outcomeType}`);
                }
            });
            
            // Check if we have at least 2 outcomes with odds
            const validOutcomes = Object.keys(bestOdds);
            if (validOutcomes.length >= 2) {
                // Calculate total implied probability
                const totalImpliedProb = validOutcomes.reduce((sum, outcomeType) => {
                    return sum + bestOdds[outcomeType].impliedProb;
                }, 0);
                
                console.log(`    📊 Total implied probability: ${(totalImpliedProb * 100).toFixed(2)}%`);
                
                // Calculate profit/loss regardless of whether it's positive
                const profitMargin = (1 - totalImpliedProb) / totalImpliedProb;
                const profitPercentage = profitMargin * 100;
                
                console.log(`    💰 Profit/Loss: ${profitPercentage.toFixed(2)}%`);
                
                // Always calculate stakes to show the scenario
                const arbitrage = this.calculateArbitrageStakes(bestOdds, 100);
                
                const opportunity = {
                    ...market,
                    bestOdds,
                    totalImpliedProb,
                    profit: profitPercentage,
                    stakes: arbitrage.stakes,
                    totalStake: arbitrage.totalStake,
                    guaranteedProfit: arbitrage.guaranteedProfit,
                    isArbitrage: totalImpliedProb < 1 // True if profitable
                };
                
                arbitrageOpportunities.push(opportunity);
                
                if (totalImpliedProb < 1) {
                    console.log(`    🎉 ARBITRAGE FOUND! Profit: ${profitPercentage.toFixed(2)}%`);
                } else {
                    console.log(`    📉 No arbitrage - would lose: ${Math.abs(profitPercentage).toFixed(2)}%`);
                }
            } else {
                console.log(`    ❌ Not enough valid outcomes (${validOutcomes.length}/2)`);
            }
        } else {
            console.log(`    ❌ Not enough outcome types (${outcomeTypes.length}/2)`);
        }
    });
    
    console.log(`\n📈 Analysis complete:`);
    console.log(`   Total opportunities: ${arbitrageOpportunities.length}`);
    console.log(`   Profitable arbitrages: ${arbitrageOpportunities.filter(op => op.isArbitrage).length}`);
    console.log(`   Unprofitable scenarios: ${arbitrageOpportunities.filter(op => !op.isArbitrage).length}`);
    
    // Sort by highest profit (positive first, then least negative)
    return arbitrageOpportunities.sort((a, b) => b.profit - a.profit);
}

// ALSO ADD this debug method to check your data structure
debugMarketGrouping() {
    console.log('\n🔍 MARKET GROUPING DEBUG:');
    
    if (this.filteredData.length > 0) {
        // Sample some records to see the structure
        const sampleRecords = this.filteredData.slice(0, 10);
        
        sampleRecords.forEach((record, index) => {
            console.log(`Record ${index + 1}:`);
            console.log(`  Game: ${this.formatGameName(record)}`);
            console.log(`  Market: ${record.display_name || record.market_type}`);
            console.log(`  Spread: ${record.spread || 'none'}`);
            console.log(`  Outcome Type: ${record.outcome_type}`);
            console.log(`  Outcome ID: ${record.outcome_id}`);
            console.log(`  Book: ${record.book}`);
            console.log(`  Odds: ${record.american_odds}`);
            console.log('---');
        });
        
        // Check for spread betting pairs
        const spreadBets = this.filteredData.filter(d => 
            d.outcome_type === 'AWAY_COVERS' || d.outcome_type === 'HOME_COVERS'
        );
        
        if (spreadBets.length > 0) {
            console.log('\n📊 SPREAD BETTING ANALYSIS:');
            
            // Group spread bets by game and spread
            const spreadGroups = {};
            spreadBets.forEach(bet => {
                const gameKey = this.formatGameName(bet);
                const spreadKey = bet.spread || 'no-spread';
                const groupKey = `${gameKey}_${spreadKey}`;
                
                if (!spreadGroups[groupKey]) {
                    spreadGroups[groupKey] = {
                        game: gameKey,
                        spread: bet.spread,
                        away_covers: [],
                        home_covers: []
                    };
                }
                
                if (bet.outcome_type === 'AWAY_COVERS') {
                    spreadGroups[groupKey].away_covers.push(bet);
                } else if (bet.outcome_type === 'HOME_COVERS') {
                    spreadGroups[groupKey].home_covers.push(bet);
                }
            });
            
            Object.entries(spreadGroups).forEach(([groupKey, group]) => {
                console.log(`\n🏈 ${group.game} (${group.spread}):`);
                console.log(`  AWAY_COVERS: ${group.away_covers.length} books`);
                console.log(`  HOME_COVERS: ${group.home_covers.length} books`);
                
                if (group.away_covers.length > 0 && group.home_covers.length > 0) {
                    console.log(`  ✅ Has both sides - should be arbitrage candidate!`);
                } else {
                    console.log(`  ❌ Missing one side - no arbitrage possible`);
                }
            });
        }
    }
}

// UPDATE your showArbitrageOpportunities method to include the debug
showArbitrageOpportunities() {
    console.log('\n🎯 ARBITRAGE ANALYSIS STARTING...');
    
    // Debug data structure first
    this.debugDataStructure();
    
    // Debug market grouping
    this.debugMarketGrouping();
    
    const arbitrageOpportunities = this.findArbitrageOpportunities(this.filteredData);
    
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   Total opportunities found: ${arbitrageOpportunities.length}`);
    console.log(`   Profitable arbitrages: ${arbitrageOpportunities.filter(op => op.isArbitrage).length}`);
    console.log(`   Unprofitable scenarios: ${arbitrageOpportunities.filter(op => !op.isArbitrage).length}`);
    
    // Check which view is active
    const desktopTable = document.getElementById('dataTable');
    const mobileCards = document.getElementById('mobileCards');
    const isMobileViewActive = mobileCards.style.display !== 'none' && 
                              desktopTable.style.display === 'none';
    
    if (isMobileViewActive) {
        this.renderArbitrageMobileCards(arbitrageOpportunities);
    } else {
        this.renderArbitrageDesktopTable(arbitrageOpportunities);
    }
    
    console.log('✅ Arbitrage view rendering complete');
}

// ALSO ADD this debugging method to understand your data better
debugMarketGrouping() {
    console.log('\n🔍 MARKET GROUPING DEBUG:');
    
    // Sample a few records to understand the structure
    const sampleRecords = this.filteredData.slice(0, 10);
    sampleRecords.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, {
            outcome_id: record.outcome_id,
            outcome_type: record.outcome_type,
            market_type: record.market_type,
            spread: record.spread,
            american_odds: record.american_odds,
            book: record.book,
            display_name: record.display_name
        });
    });
    
    // Check for spread-related markets
    const spreadMarkets = this.filteredData.filter(d => 
        d.market_type === 'spread' || 
        (d.outcome_type && (d.outcome_type.includes('COVERS') || d.outcome_type.includes('SPREAD')))
    );
    
    console.log(`\n📊 Found ${spreadMarkets.length} spread-related records`);
    
    // Group by outcome_id to see if we have matching pairs
    const outcomeGroups = {};
    spreadMarkets.forEach(record => {
        if (!outcomeGroups[record.outcome_id]) {
            outcomeGroups[record.outcome_id] = {};
        }
        if (!outcomeGroups[record.outcome_id][record.outcome_type]) {
            outcomeGroups[record.outcome_id][record.outcome_type] = [];
        }
        outcomeGroups[record.outcome_id][record.outcome_type].push(record);
    });
    
    console.log('\n📋 Outcome grouping for spread markets:');
    Object.entries(outcomeGroups).forEach(([outcomeId, outcomes]) => {
        const outcomeTypes = Object.keys(outcomes);
        console.log(`${outcomeId}: ${outcomeTypes.join(', ')} (${outcomeTypes.length} types)`);
        
        if (outcomeTypes.length >= 2) {
            console.log(`  ✅ This should create an arbitrage opportunity!`);
        }
    });
}

// ALSO ADD this debugging method to understand your data better
debugMarketGrouping() {
    console.log('\n🔍 MARKET GROUPING DEBUG:');
    
    // Sample a few records to understand the structure
    const sampleRecords = this.filteredData.slice(0, 10);
    sampleRecords.forEach((record, index) => {
        console.log(`Record ${index + 1}:`, {
            outcome_id: record.outcome_id,
            outcome_type: record.outcome_type,
            market_type: record.market_type,
            spread: record.spread,
            american_odds: record.american_odds,
            book: record.book,
            display_name: record.display_name
        });
    });
    
    // Check for spread-related markets
    const spreadMarkets = this.filteredData.filter(d => 
        d.market_type === 'spread' || 
        (d.outcome_type && (d.outcome_type.includes('COVERS') || d.outcome_type.includes('SPREAD')))
    );
    
    console.log(`\n📊 Found ${spreadMarkets.length} spread-related records`);
    
    // Group by outcome_id to see if we have matching pairs
    const outcomeGroups = {};
    spreadMarkets.forEach(record => {
        if (!outcomeGroups[record.outcome_id]) {
            outcomeGroups[record.outcome_id] = {};
        }
        if (!outcomeGroups[record.outcome_id][record.outcome_type]) {
            outcomeGroups[record.outcome_id][record.outcome_type] = [];
        }
        outcomeGroups[record.outcome_id][record.outcome_type].push(record);
    });
    
    console.log('\n📋 Outcome grouping for spread markets:');
    Object.entries(outcomeGroups).forEach(([outcomeId, outcomes]) => {
        const outcomeTypes = Object.keys(outcomes);
        console.log(`${outcomeId}: ${outcomeTypes.join(', ')} (${outcomeTypes.length} types)`);
        
        if (outcomeTypes.length >= 2) {
            console.log(`  ✅ This should create an arbitrage opportunity!`);
        }
    });
}
// REPLACE your existing renderArbitrageDesktopTable method with this enhanced version

renderArbitrageDesktopTable(arbitrageOpportunities) {
    const tbody = document.getElementById('tableBody');
    
    console.log(`🖥️ Rendering ${arbitrageOpportunities.length} opportunities in desktop table`);
    
    if (arbitrageOpportunities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="no-data">No arbitrage opportunities found</td></tr>';
        return;
    }
    
    tbody.innerHTML = arbitrageOpportunities.map(arb => {
        const outcomeTypes = Object.keys(arb.bestOdds);
        const isProfit = arb.isArbitrage;
        const statusClass = isProfit ? 'profit' : 'loss';
        const statusText = isProfit ? 'ARBITRAGE' : 'LOSS';
        
        return `
            <tr class="arbitrage-row ${statusClass}">
                <td colspan="13" class="arbitrage-header">
                    <div class="arb-summary">
                        <div class="arb-game">
                            <strong>${arb.game_name}</strong>
                            <span class="arb-market">${arb.display_name}</span>
                            ${arb.spread ? `<span class="arb-spread">(${arb.spread})</span>` : ''}
                            <span class="live-indicator ${arb.live ? 'live' : 'prematch'}"></span>
                            <span class="arb-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="arb-profit">
                            <strong>${isProfit ? 'Profit' : 'Loss'}: ${Math.abs(arb.profit).toFixed(2)}%</strong>
                            <span class="arb-guaranteed ${statusClass}">
                                ${isProfit ? '+' : '-'}$${Math.abs(arb.guaranteedProfit).toFixed(2)} 
                                ${isProfit ? 'guaranteed' : 'loss'}
                            </span>
                        </div>
                    </div>
                    <div class="arb-details">
                        ${outcomeTypes.map(outcomeType => {
                            const stake = arb.stakes[outcomeType];
                            return `
                                <div class="arb-bet">
                                    <span class="arb-book">${stake.book}</span>
                                    <span class="arb-outcome">${outcomeType}</span>
                                    <span class="arb-odds">${stake.odds}</span>
                                    <span class="arb-stake">Bet: $${stake.stake.toFixed(2)}</span>
                                    <span class="arb-payout">Payout: $${stake.payout.toFixed(2)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// REPLACE your existing renderArbitrageMobileCards method with this enhanced version

renderArbitrageMobileCards(arbitrageOpportunities) {
    const container = document.getElementById('mobileCards');
    
    console.log(`📱 Rendering ${arbitrageOpportunities.length} opportunities in mobile cards`);
    
    if (arbitrageOpportunities.length === 0) {
        container.innerHTML = '<div class="no-data-card">No arbitrage opportunities found</div>';
        return;
    }
    
    container.innerHTML = arbitrageOpportunities.map(arb => {
        const outcomeTypes = Object.keys(arb.bestOdds);
        const isProfit = arb.isArbitrage;
        const statusClass = isProfit ? 'profit' : 'loss';
        const statusText = isProfit ? 'ARBITRAGE' : 'LOSS';
        
        return `
            <div class="arbitrage-card ${statusClass}">
                <div class="arb-card-header">
                    <div class="arb-game-info">
                        <div class="arb-game-name">${arb.game_name}</div>
                        <div class="arb-market-name">${arb.display_name}</div>
                        ${arb.spread ? `<div class="arb-spread-info">${arb.spread}</div>` : ''}
                    </div>
                    <div class="arb-profit-info">
                        <div class="arb-profit-percent ${statusClass}">
                            ${isProfit ? '+' : '-'}${Math.abs(arb.profit).toFixed(2)}%
                        </div>
                        <div class="arb-guaranteed-profit ${statusClass}">
                            ${isProfit ? '+' : '-'}$${Math.abs(arb.guaranteedProfit).toFixed(2)}
                        </div>
                        <div class="arb-status ${arb.live ? 'live' : 'pre'}">${arb.live ? 'LIVE' : 'PRE'}</div>
                        <div class="arb-type ${statusClass}">${statusText}</div>
                    </div>
                </div>
                
                <div class="arb-bets">
                    ${outcomeTypes.map(outcomeType => {
                        const stake = arb.stakes[outcomeType];
                        return `
                            <div class="arb-bet-card">
                                <div class="arb-bet-header">
                                    <span class="arb-book-name">${stake.book}</span>
                                    <span class="arb-outcome-type">${outcomeType}</span>
                                </div>
                                <div class="arb-bet-details">
                                    <div class="arb-odds-display">${stake.odds}</div>
                                    <div class="arb-stake-amount">Bet: $${stake.stake.toFixed(2)}</div>
                                    <div class="arb-payout-amount">→ $${stake.payout.toFixed(2)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ADD this method to help debug data structure
debugDataStructure() {
    console.log('\n🔍 DATA STRUCTURE ANALYSIS:');
    
    if (this.filteredData.length > 0) {
        const sample = this.filteredData[0];
        console.log('Sample record keys:', Object.keys(sample));
        console.log('Sample record:', sample);
        
        // Check for required fields
        const requiredFields = ['outcome_id', 'outcome_type', 'american_odds', 'book'];
        requiredFields.forEach(field => {
            const hasField = this.filteredData.filter(d => d[field] !== undefined).length;
            console.log(`${field}: ${hasField}/${this.filteredData.length} records have this field`);
        });
        
        // Check outcome types
        const outcomeTypes = new Set(this.filteredData.map(d => d.outcome_type).filter(Boolean));
        console.log('Unique outcome types:', [...outcomeTypes]);
        
        // Check outcome IDs
        const outcomeIds = new Set(this.filteredData.map(d => d.outcome_id).filter(Boolean));
        console.log(`Unique outcome IDs: ${outcomeIds.size}`);
        
        // Check books
        const books = new Set(this.filteredData.map(d => d.book).filter(Boolean));
        console.log('Available books:', [...books]);
    } else {
        console.log('❌ No filtered data available');
    }
}

// Convert American odds to implied probability
americanOddsToImpliedProbability(americanOdds) {
    const odds = parseInt(americanOdds);
    if (odds > 0) {
        return 100 / (odds + 100);
    } else {
        return Math.abs(odds) / (Math.abs(odds) + 100);
    }
}

// Calculate arbitrage stakes
calculateArbitrageStakes(bestOdds, totalBetAmount) {
    const stakes = {};
    const outcomeTypes = Object.keys(bestOdds);
    let totalStake = 0;
    
    outcomeTypes.forEach(outcomeType => {
        const impliedProb = bestOdds[outcomeType].impliedProb;
        const stake = totalBetAmount * impliedProb;
        stakes[outcomeType] = {
            stake: stake,
            book: bestOdds[outcomeType].outcome.book,
            odds: bestOdds[outcomeType].outcome.american_odds,
            payout: this.calculatePayout(stake, bestOdds[outcomeType].outcome.american_odds)
        };
        totalStake += stake;
    });
    
    const guaranteedProfit = Object.values(stakes)[0].payout - totalStake;
    
    return {
        stakes,
        totalStake,
        guaranteedProfit
    };
}

// Calculate payout from stake and American odds
calculatePayout(stake, americanOdds) {
    const odds = parseInt(americanOdds);
    if (odds > 0) {
        return stake + (stake * odds / 100);
    } else {
        return stake + (stake * 100 / Math.abs(odds));
    }
}

// Method to toggle between regular view and arbitrage view
toggleArbitrageView() {
    const currentView = document.getElementById('currentView').textContent;
    const arbitrageBtn = document.getElementById('arbitrageToggle');
    
    if (currentView === 'regular') {
        // Switch to arbitrage view
        this.showArbitrageOpportunities();
        document.getElementById('currentView').textContent = 'arbitrage';
        arbitrageBtn.textContent = '📊 Regular View';
        arbitrageBtn.style.background = '#e74c3c';
    } else {
        // Switch back to regular view
        this.renderTable();
        document.getElementById('currentView').textContent = 'regular';
        arbitrageBtn.textContent = '🔄 Arbitrage View';
        arbitrageBtn.style.background = '#9b59b6';
    }
}

// Method to display arbitrage opportunities
// REPLACE your existing showArbitrageOpportunities method with this version

showArbitrageOpportunities() {
    console.log('\n🎯 ARBITRAGE ANALYSIS STARTING...');
    
    // Debug data structure first
    this.debugDataStructure();
    
    const arbitrageOpportunities = this.findArbitrageOpportunities(this.filteredData);
    
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`   Total opportunities found: ${arbitrageOpportunities.length}`);
    console.log(`   Profitable arbitrages: ${arbitrageOpportunities.filter(op => op.isArbitrage).length}`);
    console.log(`   Unprofitable scenarios: ${arbitrageOpportunities.filter(op => !op.isArbitrage).length}`);
    
    // Check which view is active
    const desktopTable = document.getElementById('dataTable');
    const mobileCards = document.getElementById('mobileCards');
    const isMobileViewActive = mobileCards.style.display !== 'none' && 
                              desktopTable.style.display === 'none';
    
    if (isMobileViewActive) {
        this.renderArbitrageMobileCards(arbitrageOpportunities);
    } else {
        this.renderArbitrageDesktopTable(arbitrageOpportunities);
    }
    
    console.log('✅ Arbitrage view rendering complete');
}

// ALSO ADD this to your applyFilters method - add this line after the sportsbook filter:
// Right after this line: filtered = filtered.filter(d => allowedSportsbooks.includes(d.book));
// Add this debugging:


// Render arbitrage opportunities in desktop table format
renderArbitrageDesktopTable(arbitrageOpportunities) {
    const tbody = document.getElementById('tableBody');
    
    if (arbitrageOpportunities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="no-data">No arbitrage opportunities found</td></tr>';
        return;
    }
    
    tbody.innerHTML = arbitrageOpportunities.map(arb => {
        const outcomeTypes = Object.keys(arb.bestOdds);
        
        return `
            <tr class="arbitrage-row">
                <td colspan="13" class="arbitrage-header">
                    <div class="arb-summary">
                        <div class="arb-game">
                            <strong>${arb.game_name}</strong>
                            <span class="arb-market">${arb.display_name}</span>
                            ${arb.spread ? `<span class="arb-spread">(${arb.spread})</span>` : ''}
                            <span class="live-indicator ${arb.live ? 'live' : 'prematch'}"></span>
                        </div>
                        <div class="arb-profit">
                            <strong>Profit: ${arb.profit.toFixed(2)}%</strong>
                            <span class="arb-guaranteed">$${arb.guaranteedProfit.toFixed(2)} guaranteed</span>
                        </div>
                    </div>
                    <div class="arb-details">
                        ${outcomeTypes.map(outcomeType => {
                            const stake = arb.stakes[outcomeType];
                            return `
                                <div class="arb-bet">
                                    <span class="arb-book">${stake.book}</span>
                                    <span class="arb-outcome">${outcomeType}</span>
                                    <span class="arb-odds">${stake.odds}</span>
                                    <span class="arb-stake">Bet: $${stake.stake.toFixed(2)}</span>
                                    <span class="arb-payout">Payout: $${stake.payout.toFixed(2)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render arbitrage opportunities in mobile card format
renderArbitrageMobileCards(arbitrageOpportunities) {
    const container = document.getElementById('mobileCards');
    
    if (arbitrageOpportunities.length === 0) {
        container.innerHTML = '<div class="no-data-card">No arbitrage opportunities found</div>';
        return;
    }
    
    container.innerHTML = arbitrageOpportunities.map(arb => {
        const outcomeTypes = Object.keys(arb.bestOdds);
        
        return `
            <div class="arbitrage-card">
                <div class="arb-card-header">
                    <div class="arb-game-info">
                        <div class="arb-game-name">${arb.game_name}</div>
                        <div class="arb-market-name">${arb.display_name}</div>
                        ${arb.spread ? `<div class="arb-spread-info">${arb.spread}</div>` : ''}
                    </div>
                    <div class="arb-profit-info">
                        <div class="arb-profit-percent">${arb.profit.toFixed(2)}%</div>
                        <div class="arb-guaranteed-profit">$${arb.guaranteedProfit.toFixed(2)}</div>
                        <div class="arb-status ${arb.live ? 'live' : 'pre'}">${arb.live ? 'LIVE' : 'PRE'}</div>
                    </div>
                </div>
                
                <div class="arb-bets">
                    ${outcomeTypes.map(outcomeType => {
                        const stake = arb.stakes[outcomeType];
                        return `
                            <div class="arb-bet-card">
                                <div class="arb-bet-header">
                                    <span class="arb-book-name">${stake.book}</span>
                                    <span class="arb-outcome-type">${outcomeType}</span>
                                </div>
                                <div class="arb-bet-details">
                                    <div class="arb-odds-display">${stake.odds}</div>
                                    <div class="arb-stake-amount">Bet: $${stake.stake.toFixed(2)}</div>
                                    <div class="arb-payout-amount">→ $${stake.payout.toFixed(2)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
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

// Replace the existing applyFilters method with this updated version

applyFilters() {
    let filtered = this.data;

    // Filter by allowed sportsbooks only - FIRST ADD MORE HERE AS YOU SEARCH
    const allowedSportsbooks = ["DRAFTKINGS","FANDUEL","BETMGM","CAESARS","ESPN","HARDROCK","BALLYBET","BET365","FANATICS","NONE"];
    filtered = filtered.filter(d => allowedSportsbooks.includes(d.book));

console.log(`🔍 Filtering debug:`);
console.log(`   Initial records: ${this.data.length}`);
console.log(`   After sportsbook filter: ${filtered.length}`);
console.log(`   Allowed sportsbooks: ${allowedSportsbooks.join(', ')}`);
// Sample some records to check structure
if (filtered.length > 0) {
    const sample = filtered.slice(0, 3);
    console.log('Sample filtered records:', sample);
}

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
    
    // Check current view and render accordingly
    const currentView = document.getElementById('currentView');
    if (currentView && currentView.textContent === 'arbitrage') {
        this.showArbitrageOpportunities();
    } else {
        this.renderTable();
    }
    
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
// Add this new method to group data by market
groupDataByMarket(data) {
    const marketGroups = {};
    
    data.forEach(record => {
        // Create a unique market key combining game and market info
        const marketKey = `${this.formatGameName(record)}_${record.display_name || record.market_type || 'Unknown'}`;
        
        if (!marketGroups[marketKey]) {
            marketGroups[marketKey] = {
                game_name: record.game_name,
                home_team: record.home_team,
                away_team: record.away_team,
                player_1: record.player_1,
                player_2: record.player_2,
                sport: record.sport,
                display_name: record.display_name,
                market_type: record.market_type,
                live: record.live,
                outcomes: [],
                bestEV: -999
            };
        }
        
        // Add this record as an outcome
        marketGroups[marketKey].outcomes.push(record);
        
        // Update best EV for this market
        if (record.ev && record.ev > marketGroups[marketKey].bestEV) {
            marketGroups[marketKey].bestEV = record.ev;
        }
    });
    
    // Convert to array and sort by best EV
    return Object.values(marketGroups).sort((a, b) => b.bestEV - a.bestEV);
}

// Add this helper method to get book initials
getBookInitials(bookName) {
    if (!bookName) return 'UK';
    
    const initials = {
        'DRAFTKINGS': 'DK',
        'FANDUEL': 'FD',
        'BETMGM': 'MGM',
        'CAESARS': 'CZR',
        'ESPN': 'ESPN',
        'HARDROCK': 'HR',
        'BALLYBET': 'BB',
        'BETONLINE': 'BOL',
        'BET365': '365',
        'FANATICS': 'FAN',
        'FLIFF': 'FLF'
    };
    
    return initials[bookName.toUpperCase()] || bookName.substring(0, 3).toUpperCase();
}

// Replace your current renderMobileCards method with this updated version
renderMobileCards() {
    const container = document.getElementById('mobileCards');
    
    if (this.filteredData.length === 0) {
        container.innerHTML = '<div class="no-data-card">No data matches filters</div>';
        return;
    }
    
    // Group the flat data by market
    const groupedData = this.groupDataByMarket(this.filteredData);
    
    container.innerHTML = groupedData.map((market, marketIndex) => {
        const outcomesHtml = market.outcomes.map((outcome, outcomeIndex) => {
            // Get spread information for display
            const spreadInfo = outcome.spread ? ` (${outcome.spread})` : '';
            const outcomeDisplayName = outcome.outcome_type + spreadInfo;
            
            return `
                <div class="compact-outcome">
                    <div class="compact-outcome-left">
                        <div class="compact-book-logo">
                            ${this.getBookLogo(outcome.book) ? 
                                `<img src="${this.getBookLogo(outcome.book)}" 
                                     alt="${outcome.book}" 
                                     class="compact-book-img">` 
                                : `<span class="compact-book-text">${this.getBookInitials(outcome.book)}</span>`
                            }
                        </div>
                        <div class="compact-outcome-info">
                            <div class="compact-outcome-type">${outcomeDisplayName}</div>
                            <div class="compact-odds">${outcome.american_odds || 'N/A'}</div>
                        </div>
                    </div>
                    <div class="compact-outcome-right">
                        <div class="compact-ev ${outcome.ev > 0 ? 'ev-positive' : 'ev-negative'}">
                            ${outcome.ev ? (outcome.ev * 100).toFixed(1) + '%' : 'N/A'}
                        </div>
                        <div class="compact-actions">
                            <button class="compact-btn compact-chart-btn" onclick="dashboard.openHistoricalChart('${outcome.outcome_id}', ${outcome.live}, '${outcome.spread || ''}', dashboard.filteredData.find(r => r.outcome_id === '${outcome.outcome_id}'))">
                                📊
                            </button>
                            ${outcome.deeplink ? 
                                `<button class="compact-btn compact-bet-btn" onclick="window.open('${outcome.deeplink}', '_blank')">Bet</button>` : ''
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="compact-card">
                <div class="compact-header">
                    <div class="compact-game-info">
                        <div class="compact-game-name">${this.formatGameName(market)}</div>
                        <div class="compact-market-type">${market.display_name || market.market_type || 'Unknown Market'}</div>
                    </div>
                    <div class="compact-meta">
                        <div class="compact-status ${market.live ? 'live' : 'pre'}">
                            ${market.live ? 'LIVE' : 'PRE'}
                        </div>
                        <div class="compact-best-ev">+${(market.bestEV * 100).toFixed(1)}%</div>
                    </div>
                </div>
                
                <div class="compact-outcomes">
                    ${outcomesHtml}
                </div>
            </div>
        `;
    }).join('');
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
// Replace the existing DOMContentLoaded event listener with this updated version

document.addEventListener('DOMContentLoaded', () => {
    dashboard = new BettingDataScraper();
    
    document.addEventListener('visibilitychange', () => {
        dashboard.handleVisibilityChange();
    });

    // Get the controls container
    const controls = document.querySelector('.controls');
    
    // Add hidden element to track current view state
    const currentView = document.createElement('span');
    currentView.id = 'currentView';
    currentView.textContent = 'regular';
    currentView.style.display = 'none';
    document.body.appendChild(currentView);

    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📊 Export';
    exportBtn.className = 'filter-input';
    exportBtn.style.background = '#2ecc71';
    exportBtn.style.color = 'white';
    exportBtn.style.border = 'none';
    exportBtn.style.cursor = 'pointer';
    exportBtn.onclick = () => dashboard.exportToCSV();
    
    const exportGroup = document.createElement('div');
    exportGroup.className = 'filter-group';
    exportGroup.appendChild(exportBtn);
    controls.appendChild(exportGroup);

    // Manual refresh button
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

    // Arbitrage toggle button
    const arbitrageBtn = document.createElement('button');
    arbitrageBtn.textContent = '🔄 Arbitrage View';
    arbitrageBtn.className = 'filter-input';
    arbitrageBtn.id = 'arbitrageToggle';
    arbitrageBtn.style.background = '#9b59b6';
    arbitrageBtn.style.color = 'white';
    arbitrageBtn.style.border = 'none';
    arbitrageBtn.style.cursor = 'pointer';
    arbitrageBtn.onclick = () => dashboard.toggleArbitrageView();
    
    const arbitrageGroup = document.createElement('div');
    arbitrageGroup.className = 'filter-group';
    arbitrageGroup.appendChild(arbitrageBtn);
    controls.appendChild(arbitrageGroup);

    window.addEventListener('beforeunload', () => {
        dashboard.destroy();
    });
});

// Keep the existing deeplink click handler
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('deeplink')) {
        const row = e.target.closest('tr');
        const link = row.dataset.link;
        if (link) {
            window.open(link, '_blank');
        }
    }
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