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
window.addToWatchlist = async function(token) {
    // If token is just an address string, create a token object
    if (typeof token === 'string') {
        token = {
            address: token,
            name: null,
            symbol: null
        };
    }

    // Ensure we have an address
    if (!token.address) {
        showWatchlistMessage('error', 'Token address is required');
        return null;
    }

    // Clean the address
    token.address = token.address.trim();

    try {
        // Check if token already exists by address
        const existingByAddress = Object.values(window.WATCHLIST_TOKENS).find(t => t.address.toLowerCase() === token.address.toLowerCase());
        if (existingByAddress) {
            showWatchlistMessage('warning', `Token already exists as ${existingByAddress.symbol}`);
            return null;
        }

        // Try to fetch token info from DexScreener
        const pair = await window.fetchPairData(token.address, token.address);
        if (pair && pair.baseToken) {
            // Use the fetched token information
            token = {
                address: token.address,
                name: token.name || `${pair.baseToken.name}`,
                symbol: token.symbol || pair.baseToken.symbol
            };
        } else {
            showWatchlistMessage('error', 'Invalid token address or token data not found');
            return null;
        }

        // Check if token already exists by symbol
        if (window.WATCHLIST_TOKENS[token.symbol]) {
            showWatchlistMessage('warning', `Token with symbol ${token.symbol} already exists`);
            return null;
        }

        // Add to watchlist object in the same format as existing tokens
        window.WATCHLIST_TOKENS[token.symbol] = {
            address: token.address,
            name: token.name,
            symbol: token.symbol
        };

        // Add to watchlist UI
        const watchlistContainer = document.querySelector('.watchlist-content');
        if (watchlistContainer) {
            const newItem = generateWatchlistItem(token);
            watchlistContainer.insertAdjacentHTML('beforeend', newItem);
            attachWatchlistItemHandlers(watchlistContainer.lastElementChild);
            showWatchlistMessage('success', `Added ${token.symbol} to watchlist`);
        }

        // Update add button state in market card if it exists
        const marketCard = document.querySelector(`.market-card[data-symbol="${token.symbol}"]`);
        if (marketCard) {
            const addBtn = marketCard.querySelector('.add-to-watchlist');
            if (addBtn) {
                addBtn.classList.add('added');
                addBtn.innerHTML = '<span class="material-icons-round">done</span>';
            }
        }

        // Immediately fetch and update the token's data
        const pairData = await window.fetchPairData(token.symbol, token.address);
        if (pairData) {
            window.updateWatchlistItem(token.symbol, pairData);
        }

        return token;
    } catch (error) {
        console.error('Error adding token to watchlist:', error);
        showWatchlistMessage('error', 'Failed to add token. Please try again.');
        return null;
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
                <input type="text" class="watchlist-popup-input" placeholder="Enter contract address" required />
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
        const addressInput = popup.querySelector('.watchlist-popup-input');

        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                popup.classList.remove('active');
                // Remove any existing message when closing
                const message = popup.querySelector('.watchlist-message');
                if (message) message.remove();
            });
        });

        addBtn.addEventListener('click', async () => {
            const address = addressInput.value.trim();
            if (address) {
                addBtn.disabled = true;
                addBtn.innerHTML = '<span class="material-icons-round loading">sync</span>Adding...';
                const addedToken = await window.addToWatchlist(address);
                addBtn.disabled = false;
                addBtn.innerHTML = '<span class="material-icons-round">add</span>Add Token';
                
                if (addedToken) {
                    addressInput.value = '';
                    setTimeout(() => popup.classList.remove('active'), 1000);
                }
            } else {
                showWatchlistMessage('error', 'Please enter a contract address');
            }
        });

        // Add enter key support
        addressInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const address = addressInput.value.trim();
                if (address) {
                    const addBtn = popup.querySelector('.watchlist-popup-btn.add');
                    addBtn.disabled = true;
                    addBtn.innerHTML = '<span class="material-icons-round loading">sync</span>Adding...';
                    const addedToken = await window.addToWatchlist(address);
                    addBtn.disabled = false;
                    addBtn.innerHTML = '<span class="material-icons-round">add</span>Add Token';
                    
                    if (addedToken) {
                        addressInput.value = '';
                        setTimeout(() => popup.classList.remove('active'), 1000);
                    }
                } else {
                    showWatchlistMessage('error', 'Please enter a contract address');
                }
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

// Function to show watchlist messages
function showWatchlistMessage(type, message) {
    const popup = document.querySelector('.watchlist-popup');
    if (!popup) return;

    // Remove any existing message
    const existingMessage = popup.querySelector('.watchlist-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message
    const messageElement = document.createElement('div');
    messageElement.className = `watchlist-message ${type}`;
    messageElement.innerHTML = `
        <span class="material-icons-round">${getMessageIcon(type)}</span>
        <span>${message}</span>
    `;

    // Insert message after the input
    const input = popup.querySelector('.watchlist-popup-input');
    input.parentNode.insertBefore(messageElement, input.nextSibling);

    // Auto remove message after 3 seconds
    setTimeout(() => {
        messageElement.classList.add('fade-out');
        setTimeout(() => messageElement.remove(), 300);
    }, 3000);
}

// Helper function to get message icon
function getMessageIcon(type) {
    switch (type) {
        case 'success': return 'check_circle';
        case 'warning': return 'warning';
        case 'error': return 'error';
        default: return 'info';
    }
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
