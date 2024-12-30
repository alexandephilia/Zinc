// Token configuration for trending cards
window.TRENDING_TOKENS = {
    SPX: {
        address: '9t1H1uDJ558iMPNkEPSN1fqkpC4XSPQ6cqSf6uEsTfTR',
         name: 'SPX6900 (Wormhole)',
        symbol: 'SPX'
    },
    POPCAT: {
        address: 'FRhB8L7Y9Qq41qZXYLtC2nw8An1RJfLLxRF2x9RwLLMo',
        name: 'Pop Cat',
        symbol: 'POPCAT'
    },
    JUP: {
        address: 'C1MgLojNLWBKADvu9BHdtgzz1oZX4dZ5zGdGcgvvW8Wz',
        name: 'Jupiter',
        symbol: 'JUP'
    },
    PENGU: {
        address: 'B4Vwozy1FGtp8SELXSXydWSzavPUGnJ77DURV2k4MhUV',
        name: 'Penguin',
        symbol: 'PENGU'
    },
    ZEUS: {
        address: 'e5x7mwprg8pdaqbt5hj1ehu4crasgukux5mwcjutuszu',
        name: 'Zeus',
        symbol: 'ZEUS'
    },
    NOS: {
        address: 'dx76uas2ckv4f13kb5zkivd5rlevjyjrsxhnharaujvb',
        name: 'Nosana',
        symbol: 'NOS'
    }
    // Add more trending tokens here
};

// Helper function to get token by symbol from trending list
window.getTrendingToken = function(symbol) {
    return window.TRENDING_TOKENS[symbol];
}

// Function to get pair address for a trending token symbol
window.getTrendingPairAddress = function(symbol) {
    const token = window.getTrendingToken(symbol);
    return token ? token.address : null;
}

// Function to fetch pair data from DexScreener (shared functionality)
window.fetchPairData = async function(symbol, pairAddress) {
    if (!pairAddress) {
        console.error(`No pair address found for symbol: ${symbol}`);
        return null;
    }

    try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`);
        const data = await response.json();
        return data.pair;
    } catch (error) {
        console.error(`Error fetching pair data for ${symbol}:`, error);
        return null;
    }
}

// Function to update market card
window.updateMarketCard = function(symbol, pair) {
    const marketCards = document.querySelectorAll(`.market-card[data-symbol="${symbol}"]`);
    marketCards.forEach(marketCard => {
        if (!marketCard || !pair) return;

        // Update price
        const priceElement = marketCard.querySelector('.market-price');
        if (priceElement) {
            const newPrice = `$${parseFloat(pair.priceUsd).toFixed(8)}`;
            if (priceElement.textContent !== newPrice) {
                priceElement.textContent = newPrice;
                priceElement.classList.add('price-update');
                setTimeout(() => priceElement.classList.remove('price-update'), 1000);
            }
        }

        // Update 24h change and card state
        const percentageElement = marketCard.querySelector('.title-percentage');
        if (percentageElement) {
            const priceChange = parseFloat(pair.priceChange.h24);
            percentageElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
            percentageElement.className = `title-percentage ${priceChange >= 0 ? 'positive' : 'negative'}`;
            
            // Update card class for styling while preserving other classes
            marketCard.classList.remove('positive', 'negative');
            marketCard.classList.add(priceChange >= 0 ? 'positive' : 'negative');
            
            // Update trend icon and its color
            const trendIcon = marketCard.querySelector('.market-trend-icon');
            if (trendIcon) {
                trendIcon.textContent = priceChange >= 0 ? 'trending_up' : 'trending_down';
                trendIcon.style.color = `var(--${priceChange >= 0 ? 'success' : 'danger'}-color)`;
            }
        }

        // Update volume and 24h stats
        const statsElement = marketCard.querySelector('.market-stats');
        if (statsElement) {
            const volume = parseFloat(pair.volume.h24);
            const mcap = parseFloat(pair.fdv);
            statsElement.innerHTML = `
                <span>Vol ${formatNumber(volume)}</span>
                <span>MCap: $${formatNumber(mcap)}</span>
            `;
        }
    });
}

// Function to show pair chart (unified DexScreener functionality)
window.showPairChart = function(pair) {
    // Hide market grid and show full chart
    const marketGridContainer = document.querySelector('.market-grid-container');
    const chartSection = document.querySelector('.chart-section');
    marketGridContainer.style.display = 'none';
    chartSection.style.height = 'calc(100vh - var(--navbar-height) - 64px)';

    // Update section header
    const sectionHeader = document.querySelector('.section-header');
    sectionHeader.innerHTML = `
        <div class="section-title">
            <span class="material-icons-round">candlestick_chart</span>
            ${pair.baseToken.symbol}/${pair.quoteToken.symbol} Chart
            <button class="icon-btn" onclick="showTrendingView()">
                <span class="material-icons-round">close</span>
            </button>
        </div>
    `;

    // Update chart title
    const chartTitle = document.querySelector('.chart-title');
    if (chartTitle) {
        const shortContractAddress = pair.baseToken.address.slice(0, 6) + '...' + pair.baseToken.address.slice(-4);
        const shortPairAddress = pair.pairAddress.slice(0, 6) + '...' + pair.pairAddress.slice(-4);
        const volume24h = formatNumber(parseFloat(pair.volume.h24));
        const mcap = formatNumber(parseFloat(pair.fdv));
        const priceChange24h = parseFloat(pair.priceChange.h24);

        chartTitle.innerHTML = `
            <img src="https://img.icons8.com/?size=100&id=NgbFFSOCkrnB&format=png&color=FFFFFF" alt="Token Logo" style="width: 24px; height: 24px;">
            <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 5px;">
                <div style="display: flex; align-items: center;">
                    <span>${pair.baseToken.name || pair.baseToken.symbol}</span>
                    <div class="volume-info">
                        <span class="volume-label">Vol:</span>
                        <span class="volume-value">$${volume24h}</span>
                    </div>
                    <div class="contract-info">
                        <span class="contract-label">Contract:</span>
                        <span class="contract-address">${shortContractAddress}</span>
                        <button class="icon-btn copy-btn contract-copy" data-copy="${pair.baseToken.address}">
                            <span class="material-icons-round">content_copy</span>
                        </button>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="font-size: 12px; color: var(--text-secondary);">${pair.baseToken.symbol}/${pair.quoteToken.symbol}</div>
                    <div class="market-info">
                        <span class="mcap-label">MCap:</span>
                        <span class="mcap-value">$${mcap}</span>
                        <span class="change-label">24h:</span>
                        <span class="change-value ${priceChange24h >= 0 ? 'positive' : 'negative'}">${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%</span>
                    </div>
                    <div class="pair-address-info">
                        <span class="pair-label">Pair:</span>
                        <span class="pair-address">${shortPairAddress}</span>
                        <button class="icon-btn copy-btn pair-copy" data-copy="${pair.pairAddress}">
                            <span class="material-icons-round">content_copy</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add click handlers for copy buttons
        const copyButtons = chartTitle.querySelectorAll('.copy-btn');
        copyButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const textToCopy = button.getAttribute('data-copy');
                await copyToClipboard(textToCopy, button);
            });
        });
    }

    // Update webpage title
    document.title = `Zinc | ${pair.baseToken.symbol}/${pair.quoteToken.symbol}`;

    // Hide TradingView controls and show calculator
    const chartControls = document.querySelector('.chart-controls');
    if (chartControls) {
        chartControls.style.display = 'none';
    }

    // Show calculator for the pair
    window.showCalculatorForPair(pair.pairAddress, pair.baseToken.symbol);

    // Update chart container with DexScreener iframe
    const container = document.getElementById('tradingview_solana');
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.innerHTML = `
        <iframe 
            src="https://dexscreener.com/solana/${pair.pairAddress}?embed=1&loadChartSettings=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15"
            style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: 0;"
        ></iframe>
    `;
}

// Helper function to copy to clipboard
async function copyToClipboard(text, clickedButton) {
    try {
        await navigator.clipboard.writeText(text);
        
        if (clickedButton) {
            const icon = clickedButton.querySelector('.material-icons-round');
            
            // Add transition class
            clickedButton.classList.add('copy-success');
            icon.textContent = 'check';
            
            // Reset after animation
            setTimeout(() => {
                clickedButton.classList.remove('copy-success');
                icon.textContent = 'content_copy';
            }, 2000);
        }
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

// Function to update trending cards data only
window.updateTrendingData = async function() {
    for (const symbol of Object.keys(window.TRENDING_TOKENS)) {
        const pairAddress = window.getTrendingPairAddress(symbol);
        const pair = await window.fetchPairData(symbol, pairAddress);
        if (pair) {
            window.updateMarketCard(symbol, pair);
        }
    }
}

// Helper function to format numbers
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

// Function to generate market card HTML
function generateMarketCard(token) {
    const isInWatchlist = window.WATCHLIST_TOKENS[token.symbol];
    return `
        <div class="market-card negative" data-symbol="${token.symbol}">
            <button class="add-to-watchlist ${isInWatchlist ? 'added' : ''}" title="${isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}">
                <span class="material-icons-round">${isInWatchlist ? 'done' : 'add'}</span>
            </button>
            <div class="market-header">
                <div class="market-title-group">
                    <div class="market-title">
                        <span class="material-icons-round market-trend-icon" style="font-size: 16px; color: var(--danger-color);">trending_down</span>
                        <span class="market-pair">${token.symbol}/SOL</span>
                    </div>
                    <div class="market-subtitle">${token.name}</div>
                </div>
                <span class="title-percentage negative">0.00%</span>
            </div>
            <div class="market-price">$0.00000000</div>
            <div class="market-stats">
                <span>Vol $0.00</span>
                <span>MCap: $0.00</span>
            </div>
        </div>
    `;
}

// Function to initialize market cards
window.initializeMarketCards = function() {
    const marketGridScroll = document.getElementById('marketGridScroll');
    if (!marketGridScroll) return;

    // Generate HTML for all cards (original + two duplicates for seamless scroll)
    const tokens = Object.values(window.TRENDING_TOKENS);
    const cardsHTML = tokens.map(token => generateMarketCard(token)).join('') +
                     tokens.map(token => generateMarketCard(token)).join('') +
                     tokens.map(token => generateMarketCard(token)).join('');
    
    marketGridScroll.innerHTML = cardsHTML;

    // Initial trending update
    window.updateTrendingData();
    
    // Set up trending update interval (every 1 second)
    const trendingInterval = setInterval(window.updateTrendingData, 1000);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(trendingInterval);
    });

    // Add click handlers for market cards and watchlist buttons
    document.addEventListener('click', async (e) => {
        const card = e.target.closest('.market-card');
        const addToWatchlistBtn = e.target.closest('.add-to-watchlist');

        if (addToWatchlistBtn && card) {
            e.stopPropagation(); // Prevent card click
            const symbol = card.getAttribute('data-symbol');
            const token = window.TRENDING_TOKENS[symbol];
            
            if (addToWatchlistBtn.classList.contains('added')) {
                window.removeFromWatchlist(symbol);
                // Update all instances of this card in the scrolling list
                document.querySelectorAll(`.market-card[data-symbol="${symbol}"] .add-to-watchlist`).forEach(btn => {
                    btn.classList.remove('added');
                    btn.innerHTML = '<span class="material-icons-round">add</span>';
                    btn.title = 'Add to watchlist';
                });
            } else {
                window.addToWatchlist(token);
                // Update all instances of this card in the scrolling list
                document.querySelectorAll(`.market-card[data-symbol="${symbol}"] .add-to-watchlist`).forEach(btn => {
                    btn.classList.add('added');
                    btn.innerHTML = '<span class="material-icons-round">done</span>';
                    btn.title = 'Remove from watchlist';
                });
            }
            return;
        }

        if (card) {
            const symbol = card.getAttribute('data-symbol');
            const pairAddress = window.getTrendingPairAddress(symbol);
            const pair = await window.fetchPairData(symbol, pairAddress);
            if (pair) {
                window.showPairChart(pair);
            }
        }
    });
}

// Initialize market cards when DOM is loaded
window.addEventListener('DOMContentLoaded', window.initializeMarketCards);
