// Token configuration for watchlist
window.WATCHLIST_TOKENS = {
    SPX: {
        address: '9t1H1uDJ558iMPNkEPSN1fqkpC4XSPQ6cqSf6uEsTfTR',
        name: 'SPX6900 (Wormhole)',
        symbol: 'SPX'
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
    // Add more watchlist tokens here
};

// Helper function to get token by symbol from watchlist
window.getWatchlistToken = function(symbol) {
    return window.WATCHLIST_TOKENS[symbol];
}

// Function to get pair address for a watchlist token symbol
window.getWatchlistPairAddress = function(symbol) {
    const token = window.getWatchlistToken(symbol);
    return token ? token.address : null;
}

// Function to add token to watchlist
window.addToWatchlist = function(token) {
    if (!window.WATCHLIST_TOKENS[token.symbol]) {
        window.WATCHLIST_TOKENS[token.symbol] = token;
        const watchlistContainer = document.querySelector('.watchlist-content');
        if (watchlistContainer) {
            const newItem = generateWatchlistItem(token);
            watchlistContainer.insertAdjacentHTML('beforeend', newItem);
            attachWatchlistItemHandlers(watchlistContainer.lastElementChild);
        }
        // Update add button state in market card
        const marketCard = document.querySelector(`.market-card[data-symbol="${token.symbol}"]`);
        if (marketCard) {
            const addBtn = marketCard.querySelector('.add-to-watchlist');
            if (addBtn) {
                addBtn.classList.add('added');
                addBtn.innerHTML = '<span class="material-icons-round">done</span>';
            }
        }
    }
}

// Function to remove token from watchlist
window.removeFromWatchlist = function(symbol) {
    if (window.WATCHLIST_TOKENS[symbol]) {
        delete window.WATCHLIST_TOKENS[symbol];
        const watchlistItem = document.querySelector(`.watchlist-item[data-symbol="${symbol}"]`);
        if (watchlistItem) {
            watchlistItem.remove();
        }
        // Update add button state in market card
        const marketCard = document.querySelector(`.market-card[data-symbol="${symbol}"]`);
        if (marketCard) {
            const addBtn = marketCard.querySelector('.add-to-watchlist');
            if (addBtn) {
                addBtn.classList.remove('added');
                addBtn.innerHTML = '<span class="material-icons-round">add</span>';
            }
        }
    }
}

// Function to generate watchlist item HTML
function generateWatchlistItem(token) {
    return `
        <div class="watchlist-item" data-symbol="${token.symbol}">
            <button class="watchlist-x-close" title="Remove from watchlist">×</button>
            <div class="watchlist-header">
                <div class="watchlist-symbol">
                    <span class="material-icons-round" style="font-size: 16px; color: var(--success-color);">trending_up</span>
                    <span>${token.symbol}/SOL</span>
                </div>
                <span class="title-percentage">0.00%</span>
            </div>
            <div class="watchlist-price">$0.00000000</div>
            <div class="watchlist-stats">
                <span>Vol $0.00</span>
                <span>MCap: $0.00</span>
            </div>
        </div>
    `;
}

// Function to show add to watchlist popup
function showAddToWatchlistPopup() {
    // Create popup if it doesn't exist
    let popup = document.querySelector('.watchlist-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.className = 'watchlist-popup';
        popup.innerHTML = `
            <div class="watchlist-popup-header">
                <div class="watchlist-popup-title">
                    <span class="material-icons-round">add</span>
                    Add to Watchlist
                </div>
                <button class="watchlist-popup-close">
                    <span class="material-icons-round">close</span>
                </button>
            </div>
            <div class="watchlist-popup-content">
                <input type="text" class="watchlist-popup-input" placeholder="Enter contract address" />
                <input type="text" class="watchlist-popup-input" placeholder="Token name (optional)" />
                <input type="text" class="watchlist-popup-input" placeholder="Token symbol (optional)" />
                <div class="watchlist-popup-actions">
                    <button class="watchlist-popup-btn cancel">Cancel</button>
                    <button class="watchlist-popup-btn add">
                        <span class="material-icons-round">add</span>
                        Add Token
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        // Add event listeners
        const closeBtn = popup.querySelector('.watchlist-popup-close');
        const cancelBtn = popup.querySelector('.watchlist-popup-btn.cancel');
        const addBtn = popup.querySelector('.watchlist-popup-btn.add');

        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                popup.classList.remove('active');
            });
        });

        addBtn.addEventListener('click', () => {
            const [address, name, symbol] = [...popup.querySelectorAll('.watchlist-popup-input')].map(input => input.value.trim());
            if (address) {
                const token = {
                    address,
                    name: name || symbol || 'Unknown Token',
                    symbol: symbol || address.slice(0, 6)
                };
                window.addToWatchlist(token);
                popup.classList.remove('active');
                // Clear inputs
                popup.querySelectorAll('.watchlist-popup-input').forEach(input => input.value = '');
            }
        });
    }
    popup.classList.add('active');
}

// Function to attach event handlers to watchlist item
function attachWatchlistItemHandlers(item) {
    // Add click handler for the close button
    const closeBtn = item.querySelector('.watchlist-x-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the watchlist item click
            const symbol = item.getAttribute('data-symbol');
            window.removeFromWatchlist(symbol);
        });
    }

    // Add click handler for the watchlist item
    item.addEventListener('click', async () => {
        // Update active state
        document.querySelectorAll('.watchlist-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Get the trading pair from the clicked item
        const symbol = item.getAttribute('data-symbol');
        
        // Get pair data from DexScreener
        if (window.WATCHLIST_TOKENS[symbol]) {
            try {
                const pairAddress = window.getWatchlistPairAddress(symbol);
                const pair = await window.fetchPairData(symbol, pairAddress);
                if (pair) {
                    window.showPairChart(pair);
                }
            } catch (error) {
                console.error('Error fetching pair data:', error);
            }
            return;
        }

        // For non-DexScreener pairs, continue with existing TradingView logic
        const container = document.getElementById('tradingview_solana');
        container.innerHTML = '';
        container.style = ''; // Reset any custom styles
        // Hide calculator before showing TradingView
        window.hideCalculator();
        window.initTradingViewWidget(container, `BINANCE:${symbol}USDT`, '15');
        
        // Update webpage title
        document.title = `Zinc | ${symbol}/SOL`;
    });
}

// Function to initialize watchlist items
function initializeWatchlistItems() {
    const watchlistContainer = document.querySelector('.watchlist-content');
    if (!watchlistContainer) return;

    // Generate HTML for all watchlist items
    const tokens = Object.values(window.WATCHLIST_TOKENS);
    const watchlistHTML = tokens.map(token => generateWatchlistItem(token)).join('');
    
    watchlistContainer.innerHTML = watchlistHTML;

    // Attach handlers to all watchlist items
    watchlistContainer.querySelectorAll('.watchlist-item').forEach(item => {
        attachWatchlistItemHandlers(item);
    });

    // Add click handler for the add button in the watchlist header
    const addBtn = document.querySelector('.sidebar-header .icon-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddToWatchlistPopup);
    }
}

// Function to update watchlist item
window.updateWatchlistItem = function(symbol, pair) {
    const watchlistItem = document.querySelector(`.watchlist-item[data-symbol="${symbol}"]`);
    if (!watchlistItem || !pair) return;

    // Update price with USD value
    const priceElement = watchlistItem.querySelector('.watchlist-price');
    if (priceElement) {
        priceElement.textContent = `$${parseFloat(pair.priceUsd).toFixed(8)}`;
    }

    // Update 24h change
    const percentageElement = watchlistItem.querySelector('.title-percentage');
    if (percentageElement) {
        const priceChange = parseFloat(pair.priceChange.h24);
        percentageElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
        percentageElement.className = `title-percentage ${priceChange > 0 ? 'positive' : 'negative'}`;
        
        // Update item class for glow effect
        watchlistItem.className = `watchlist-item ${priceChange > 0 ? 'positive' : 'negative'}`;
        if (watchlistItem.classList.contains('active')) {
            watchlistItem.classList.add('active');
        }
        
        // Update trend icon
        const trendIcon = watchlistItem.querySelector('.material-icons-round');
        if (trendIcon) {
            trendIcon.textContent = priceChange > 0 ? 'trending_up' : 'trending_down';
            trendIcon.style.color = `var(--${priceChange > 0 ? 'success' : 'danger'}-color)`;
        }
    }

    // Update volume and 24h change in stats
    const statsElement = watchlistItem.querySelector('.watchlist-stats');
    if (statsElement) {
        const volume = parseFloat(pair.volume.h24);
        const mcap = parseFloat(pair.fdv);
        statsElement.innerHTML = `
            <span>Vol ${formatNumber(volume)}</span>
            <span>MCap: $${formatNumber(mcap)}</span>
        `;
    }
}

// Function to update all watchlist items
window.updateWatchlistData = async function() {
    for (const symbol of Object.keys(window.WATCHLIST_TOKENS)) {
        const pairAddress = window.getWatchlistPairAddress(symbol);
        const pair = await window.fetchPairData(symbol, pairAddress);
        if (pair) {
            window.updateWatchlistItem(symbol, pair);
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

// Initialize watchlist functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize watchlist items
    initializeWatchlistItems();
    
    // Initial watchlist update
    window.updateWatchlistData();
    
    // Set up watchlist update interval (every 1 second)
    const watchlistInterval = setInterval(window.updateWatchlistData, 1000);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(watchlistInterval);
    });

    // Add click handlers for watchlist items
    document.querySelectorAll('.watchlist-item').forEach(item => {
        item.addEventListener('click', async () => {
            // Update active state
            document.querySelectorAll('.watchlist-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Get the trading pair from the clicked item
            const symbol = item.getAttribute('data-symbol');
            
            // Get pair data from DexScreener
            if (window.WATCHLIST_TOKENS[symbol]) {
                try {
                    const pairAddress = window.getWatchlistPairAddress(symbol);
                    const pair = await window.fetchPairData(symbol, pairAddress);
                    if (pair) {
                        window.showPairChart(pair);
                    }
                } catch (error) {
                    console.error('Error fetching pair data:', error);
                }
                return;
            }

            // For non-DexScreener pairs, continue with existing TradingView logic
            const container = document.getElementById('tradingview_solana');
            container.innerHTML = '';
            container.style = ''; // Reset any custom styles
            // Hide calculator before showing TradingView
            window.hideCalculator();
            window.initTradingViewWidget(container, `BINANCE:${symbol}USDT`, '15');
            
            // Update webpage title
            document.title = `Zinc | ${symbol}/SOL`;
        });
    });
});
