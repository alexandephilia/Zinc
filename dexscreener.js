// Token configuration for trending cards
window.TRENDING_TOKENS = {};

// Rate limiting configuration
window.API_CONFIG = {
    lastFetchTimestamp: 0,
    minFetchInterval: 500, // Minimum 500ms between requests
    consecutiveErrors: 0,
    backoffDelay: 1000, // Initial backoff delay
    maxBackoffDelay: 30000, // Maximum backoff delay
    rateLimitCooldown: false
};

// Function to handle rate limiting and backoff
async function withRateLimit(apiCall) {
    const now = Date.now();
    const timeSinceLastFetch = now - window.API_CONFIG.lastFetchTimestamp;
    
    // Enforce minimum interval between requests
    if (timeSinceLastFetch < window.API_CONFIG.minFetchInterval) {
        await new Promise(resolve => 
            setTimeout(resolve, window.API_CONFIG.minFetchInterval - timeSinceLastFetch)
        );
    }

    // If in cooldown, wait
    if (window.API_CONFIG.rateLimitCooldown) {
        await new Promise(resolve => 
            setTimeout(resolve, window.API_CONFIG.maxBackoffDelay)
        );
        window.API_CONFIG.rateLimitCooldown = false;
    }

    try {
        window.API_CONFIG.lastFetchTimestamp = Date.now();
        const result = await apiCall();
        
        // Reset error count on success
        window.API_CONFIG.consecutiveErrors = 0;
        window.API_CONFIG.backoffDelay = 1000;
        
        return result;
    } catch (error) {
        // Handle rate limiting specifically
        if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
            window.API_CONFIG.rateLimitCooldown = true;
            window.API_CONFIG.consecutiveErrors++;
            
            // Exponential backoff
            const backoffDelay = Math.min(
                window.API_CONFIG.backoffDelay * Math.pow(2, window.API_CONFIG.consecutiveErrors),
                window.API_CONFIG.maxBackoffDelay
            );
            
            console.warn(`Rate limit detected, backing off for ${backoffDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
        throw error;
    }
}

// Function to fetch trending tokens with retry mechanism
window.fetchTrendingTokens = async function(retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    try {
        const response = await withRateLimit(() => 
            fetch('https://api.dexscreener.com/token-boosts/top/v1')
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Process only Solana tokens
        const solanaTokens = data.filter(token => token.chainId === 'solana');
        
        if (solanaTokens.length === 0 && retryCount < MAX_RETRIES) {
            console.warn(`No Solana tokens found, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return window.fetchTrendingTokens(retryCount + 1);
        }

        // Update TRENDING_TOKENS with new data
        window.TRENDING_TOKENS = {};

        // Process each token
        solanaTokens.forEach(token => {
            // Extract token symbol from address if not available
            const symbol = token.tokenAddress.slice(0, 6).toUpperCase();
            
            window.TRENDING_TOKENS[symbol] = {
                address: token.tokenAddress,
                name: null, // Will be updated from pair data
                symbol: symbol,
                priceUsd: '0',
                volume24h: 0,
                liquidity: 0,
                priceChange: { h24: 0 },
                pairAddress: null
            };
        });

        // Fetch price data with retry mechanism
        const fetchPriceWithRetry = async (token, retryCount = 0) => {
            try {
                const response = await withRateLimit(() =>
                    fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`)
                );
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.pairs && data.pairs.length > 0) {
                    const solanaPair = data.pairs
                        .filter(pair => pair.chainId === 'solana')
                        .sort((a, b) => parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0))[0];

                    if (solanaPair) {
                        if (solanaPair.baseToken) {
                            token.symbol = solanaPair.baseToken.symbol;
                            // Only set name if it exists and is not the same as symbol
                            if (solanaPair.baseToken.name && solanaPair.baseToken.name !== solanaPair.baseToken.symbol) {
                                token.name = solanaPair.baseToken.name;
                            } else {
                                token.name = solanaPair.baseToken.symbol;
                            }
                        }
                        
                        token.priceUsd = solanaPair.priceUsd;
                        token.volume24h = solanaPair.volume?.h24 || 0;
                        token.liquidity = solanaPair.liquidity?.usd || 0;
                        token.priceChange = solanaPair.priceChange || { h24: 0 };
                        token.pairAddress = solanaPair.pairAddress;
                    }
                }
            } catch (error) {
                if (retryCount < MAX_RETRIES) {
                    console.warn(`Retrying price fetch for ${token.symbol}... (${retryCount + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return fetchPriceWithRetry(token, retryCount + 1);
                }
                console.error(`Failed to fetch price data for ${token.symbol}:`, error);
            }
        };

        // Fetch prices in parallel with a concurrency limit
        const CONCURRENT_REQUESTS = 5;
        const tokens = Object.values(window.TRENDING_TOKENS);
        for (let i = 0; i < tokens.length; i += CONCURRENT_REQUESTS) {
            const batch = tokens.slice(i, i + CONCURRENT_REQUESTS);
            await Promise.all(batch.map(token => fetchPriceWithRetry(token)));
        }

        return true; // Indicate successful fetch
    } catch (error) {
        console.error('Error fetching trending tokens:', error);
        if (retryCount < MAX_RETRIES) {
            const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount);
            console.warn(`Retrying trending tokens fetch... (${retryCount + 1}/${MAX_RETRIES}) after ${backoffDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            return window.fetchTrendingTokens(retryCount + 1);
        }
        throw error; // Re-throw if all retries failed
    }
}

// Helper function to get token by symbol from trending list
window.getTrendingToken = function(symbol) {
    return window.TRENDING_TOKENS[symbol];
}

// Function to get pair address for a trending token symbol
window.getTrendingPairAddress = function(symbol) {
    const token = window.getTrendingToken(symbol);
    return token ? token.pairAddress : null;
}

// Function to fetch pair data from DexScreener
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

// Function to format price with smart decimal notation
function formatTokenPrice(price) {
    if (!price) return '$0.00';
    
    const numPrice = parseFloat(price);
    if (numPrice === 0) return '$0.00';
    
    // For prices >= 0.00000001, show normal format
    if (numPrice >= 0.00000001) {
        return `$${numPrice.toFixed(8)}`;
    }
    
    // For very small numbers, use special notation
    const priceStr = numPrice.toFixed(10);
    const zeroCount = priceStr.match(/^0\.0*/)[0].length - 2; // Count zeros after decimal
    
    // Extract significant digits after zeros
    const significantDigits = priceStr.slice(zeroCount + 2, zeroCount + 6);
    
    return `$0.00(${zeroCount})${significantDigits}`;
}

// Function to update market card
window.updateMarketCard = function(symbol, pair) {
    const marketCards = document.querySelectorAll(`.market-card[data-symbol="${symbol}"]`);
    marketCards.forEach(marketCard => {
        if (!marketCard || !pair) return;

        // Update token information if available
        const token = window.TRENDING_TOKENS[symbol];
        if (pair.baseToken && token) {
            token.symbol = pair.baseToken.symbol;
            if (pair.baseToken.name && pair.baseToken.name !== pair.baseToken.symbol) {
                token.name = pair.baseToken.name;
            }
        }

        // Format symbol with $ prefix
        const formattedSymbol = `$${token.symbol}`;

        // Update title and subtitle with ellipsis
        const titleElement = marketCard.querySelector('.market-pair');
        const subtitleElement = marketCard.querySelector('.market-subtitle');
        if (titleElement) {
            titleElement.textContent = `${formattedSymbol}/SOL`;
        }
        if (subtitleElement) {
            const maxDescLength = 20;
            let displayName = token.name && token.name !== token.symbol ? token.name : formattedSymbol;
            if (displayName.length > maxDescLength) {
                displayName = displayName.substring(0, maxDescLength) + '...';
            }
            subtitleElement.textContent = displayName;
            subtitleElement.title = token.name || formattedSymbol; // Full text in tooltip
        }

        // Update price with new formatting
        const priceElement = marketCard.querySelector('.market-price');
        if (priceElement) {
            const newPrice = formatTokenPrice(pair.priceUsd);
            if (priceElement.textContent !== newPrice) {
                priceElement.textContent = newPrice;
                priceElement.classList.add('price-update');
                setTimeout(() => priceElement.classList.remove('price-update'), 1000);
            }
        }

        // Update 24h change and card state
        const percentageElement = marketCard.querySelector('.title-percentage');
        if (percentageElement) {
            const priceChange = parseFloat(pair.priceChange?.h24 || 0);
            percentageElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
            percentageElement.className = `title-percentage ${priceChange >= 0 ? 'positive' : 'negative'}`;
            
            // Update card class for styling while preserving other classes
            marketCard.classList.remove('positive', 'negative');
            marketCard.classList.add(priceChange >= 0 ? 'positive' : 'negative');
            
            // Update trend icon and its color
            const trendIcon = marketCard.querySelector('.market-trend-icon');
            if (trendIcon) {
                trendIcon.textContent = priceChange >= 0 ? 'trending_up' : 'trending_down';
                trendIcon.style.color = priceChange >= 0 ? '#00FF88' : '#FF3B69';
            }
        }

        // Update volume and stats
        const statsElement = marketCard.querySelector('.market-stats');
        if (statsElement) {
            const volume = parseFloat(pair.volume?.h24 || 0);
            const liquidity = parseFloat(pair.liquidity?.usd || 0);
            statsElement.innerHTML = `
                <span>Vol $${formatNumber(volume)}</span>
                <span>Liq: $${formatNumber(liquidity)}</span>
            `;
        }
    });
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
    const marketGridScroll = document.getElementById('marketGridScroll');
    if (!marketGridScroll) return;

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
    const isInWatchlist = window.WATCHLIST_TOKENS?.[token.symbol];
    const priceChange = parseFloat(token.priceChange?.h24 || 0);
    const trendClass = priceChange >= 0 ? 'positive' : 'negative';
    const trendIcon = priceChange >= 0 ? 'trending_up' : 'trending_down';
    
    // Format symbol with $ prefix
    const formattedSymbol = token.symbol.startsWith('$') ? token.symbol : `$${token.symbol}`;
    
    // For subtitle, use name if it's different from symbol, otherwise use symbol
    const maxDescLength = 20;
    let displayName = token.name && token.name !== token.symbol ? token.name : formattedSymbol;
    if (displayName.length > maxDescLength) {
        displayName = displayName.substring(0, maxDescLength) + '...';
    }
    
    return `
        <div class="market-card ${trendClass}" data-symbol="${token.symbol}" data-pair-address="${token.pairAddress}">
            <button class="add-to-watchlist ${isInWatchlist ? 'added' : ''}" title="${isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}">
                <span class="material-icons-round">${isInWatchlist ? 'done' : 'add'}</span>
            </button>
            <div class="market-header">
                <div class="market-title-group">
                    <div class="market-title">
                        <span class="material-icons-round market-trend-icon" style="font-size: 16px; color: var(${priceChange >= 0 ? '--success-color' : '--danger-color'});">${trendIcon}</span>
                        <span class="market-pair">${formattedSymbol}/SOL</span>
                    </div>
                    <div class="market-subtitle" title="${token.name || formattedSymbol}">${displayName}</div>
                </div>
                <span class="title-percentage ${trendClass}">${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%</span>
            </div>
            <div class="market-price">${formatTokenPrice(token.priceUsd)}</div>
            <div class="market-stats">
                <span>Vol $${formatNumber(token.volume24h || 0)}</span>
                <span>Liq: $${formatNumber(token.liquidity || 0)}</span>
            </div>
        </div>
    `;
}

// Function to handle infinite scroll
function handleInfiniteScroll() {
    const marketGridScroll = document.getElementById('marketGridScroll');
    if (!marketGridScroll) return;

    const cards = marketGridScroll.querySelectorAll('.market-card');
    if (cards.length === 0) return;

    const tokens = Object.values(window.TRENDING_TOKENS);
    if (tokens.length === 0) return;

    // FIXED VALUES - NO MORE DYNAMIC BULLSHIT
    const FIXED_TOTAL_SETS = 10; // We maintain exactly 10 sets at all times
    const setSize = tokens.length;
    const cardHeight = cards[0].offsetHeight;
    const scrollPosition = marketGridScroll.scrollTop;
    const containerHeight = marketGridScroll.offsetHeight;
    const totalScrollHeight = marketGridScroll.scrollHeight;
    
    // If we're near the bottom, add to bottom and remove from top
    if (scrollPosition + containerHeight > totalScrollHeight - (cardHeight * setSize)) {
        // Add one set to bottom
        tokens.forEach(token => {
            const cardHTML = generateMarketCard(token);
            marketGridScroll.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        // Remove one set from top only if we exceed our fixed total
        if (marketGridScroll.querySelectorAll('.market-card').length > setSize * FIXED_TOTAL_SETS) {
            for (let i = 0; i < setSize; i++) {
                cards[i]?.remove();
            }
            // Adjust scroll position to prevent jump
            marketGridScroll.scrollTop = scrollPosition - (cardHeight * setSize);
        }
    }

    // If we're near the top, add to top and remove from bottom
    if (scrollPosition < cardHeight * setSize) {
        // Add one set to top
        const heightBeforeAdd = marketGridScroll.scrollHeight;
        tokens.forEach(token => {
            const cardHTML = generateMarketCard(token);
            marketGridScroll.insertAdjacentHTML('afterbegin', cardHTML);
        });
        
        // Remove one set from bottom only if we exceed our fixed total
        if (marketGridScroll.querySelectorAll('.market-card').length > setSize * FIXED_TOTAL_SETS) {
            const allCards = marketGridScroll.querySelectorAll('.market-card');
            for (let i = 0; i < setSize; i++) {
                allCards[allCards.length - 1 - i]?.remove();
            }
        }
        
        // Maintain scroll position
        marketGridScroll.scrollTop = scrollPosition + (marketGridScroll.scrollHeight - heightBeforeAdd);
    }
}

// Function to generate skeleton card HTML
function generateSkeletonCard() {
    return `
        <div class="market-card skeleton">
            <div class="skeleton-button"></div>
            <div class="market-header">
                <div class="market-title-group">
                    <div class="market-title">
                        <div class="skeleton-icon"></div>
                        <div class="skeleton-text-long"></div>
                    </div>
                    <div class="skeleton-text-short"></div>
                </div>
                <div class="skeleton-text-short"></div>
            </div>
            <div class="skeleton-text-long"></div>
            <div class="market-stats">
                <div class="skeleton-text-medium"></div>
                <div class="skeleton-text-medium"></div>
            </div>
        </div>
    `;
}

// Function to initialize market cards
window.initializeMarketCards = function() {
    const marketGridScroll = document.getElementById('marketGridScroll');
    if (!marketGridScroll) return;

    let isInitialLoad = true;
    let retryAttempt = 0;
    const MAX_INIT_RETRIES = 3;

    const initializeWithRetry = async () => {
        try {
            // Show skeleton loading first
            if (isInitialLoad) {
                const approximateVisibleCards = Math.ceil(window.innerHeight / 100) * 2;
                const skeletonCards = Array(approximateVisibleCards).fill(generateSkeletonCard()).join('');
                marketGridScroll.innerHTML = skeletonCards;
            }

            // Initial fetch of trending tokens
            await window.fetchTrendingTokens();
            const tokens = Object.values(window.TRENDING_TOKENS);
            
            if (tokens.length === 0) {
                throw new Error('No tokens fetched');
            }

            // Calculate initial sets needed
            const cardHeight = 100;
            const containerHeight = marketGridScroll.offsetHeight;
            const setsInViewport = Math.ceil(containerHeight / (cardHeight * tokens.length));
            const totalSetsNeeded = Math.min(10, setsInViewport + 2); // Never exceed 10 sets

            // Generate initial cards
            const initialCards = Array(totalSetsNeeded).fill(tokens)
                .flat()
                .map(token => generateMarketCard(token))
                .join('');

            // Quick transition
            marketGridScroll.style.opacity = '0';
            marketGridScroll.innerHTML = initialCards;

            requestAnimationFrame(() => {
                marketGridScroll.style.transition = 'opacity 0.15s ease-out';
                marketGridScroll.style.opacity = '1';
                marketGridScroll.scrollTop = cardHeight * tokens.length;
                
                setTimeout(() => {
                    marketGridScroll.style.transition = '';
                }, 150);
            });

            isInitialLoad = false;

            // Set up data updates with more conservative timing
            if (!window.trendingUpdateIntervals) {
                window.trendingUpdateIntervals = {
                    data: setInterval(async () => {
                        // Update data without resetting the view
                        const currentScroll = marketGridScroll.scrollTop;
                        await window.updateTrendingData();
                        marketGridScroll.scrollTop = currentScroll;
                    }, 5000)
                };
            }

        } catch (error) {
            console.error('Failed to initialize market cards:', error);
            retryAttempt++;
            
            if (retryAttempt < MAX_INIT_RETRIES) {
                console.warn(`Retrying initialization... (${retryAttempt}/${MAX_INIT_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await initializeWithRetry();
            } else {
                // Show error state in UI
                marketGridScroll.innerHTML = `
                    <div class="error-state">
                        <span class="material-icons-round">error_outline</span>
                        <p>Failed to load trending tokens</p>
                        <button onclick="window.initializeMarketCards()">Retry</button>
                    </div>
                `;
            }
        }
    };

    // Start initialization
    initializeWithRetry();

    // More responsive scroll handling with debounce
    let scrollTimeout;
    marketGridScroll.addEventListener('scroll', () => {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(() => {
                handleInfiniteScroll();
                scrollTimeout = null;
            }, 30);
        }
    });

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (window.trendingUpdateIntervals) {
            clearInterval(window.trendingUpdateIntervals.data);
        }
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
            const pairAddress = card.getAttribute('data-pair-address');
            if (pairAddress) {
            const pair = await window.fetchPairData(symbol, pairAddress);
            if (pair) {
                window.showPairChart(pair);
                }
            }
        }
    });
}

// Add CSS styles for skeleton loading
const style = document.createElement('style');
style.textContent = `
    .skeleton {
        position: relative;
        overflow: hidden;
    }

    .skeleton > * {
        position: relative;
        z-index: 1;
    }

    .skeleton::before,
    .skeleton::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    }

    .skeleton::before {
        background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 20%,
            rgba(255, 255, 255, 0.1) 60%,
            rgba(255, 255, 255, 0.05) 80%,
            transparent 100%
        );
        transform: translateX(-100%);
        animation: shimmerWave 2s infinite;
        z-index: 2;
    }

    .skeleton::after {
        background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.02) 50%,
            transparent 100%
        );
        transform: translateX(-100%);
        animation: shimmerWave 2s infinite 0.5s;
        z-index: 1;
    }

    @keyframes shimmerWave {
        0% {
            transform: translateX(-100%);
        }
        50%, 100% {
            transform: translateX(100%);
        }
    }

    .skeleton-button {
        width: 24px;
        height: 24px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 50%;
        margin: 8px;
    }

    .skeleton-icon {
        width: 16px;
        height: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 50%;
        display: inline-block;
        margin-right: 8px;
    }

    .skeleton-text-short,
    .skeleton-text-medium,
    .skeleton-text-long {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        margin: 4px 0;
        transform: translateZ(0);
        will-change: transform;
    }

    .skeleton-text-short {
        width: 60px;
        height: 16px;
    }

    .skeleton-text-medium {
        width: 100px;
        height: 16px;
    }

    .skeleton-text-long {
        width: 140px;
        height: 16px;
    }

    /* Enhance skeleton card appearance */
    .market-card.skeleton {
        background: rgb(22, 21, 21);
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transform: translateZ(0);
        will-change: transform;
    }

    /* Add subtle pulse animation to elements */
    .skeleton-text-short,
    .skeleton-text-medium,
    .skeleton-text-long,
    .skeleton-button,
    .skeleton-icon {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 0.8;
        }
        50% {
            opacity: 0.4;
        }
    }

    /* Hardware acceleration for smoother animations */
    .skeleton,
    .skeleton::before,
    .skeleton::after {
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
        transform: translateZ(0);
        perspective: 1000px;
        will-change: transform;
    }
`;

document.head.appendChild(style);

// Add error state styles
const errorStyles = `
    .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 200px;
        gap: 16px;
        color: var(--text-primary);
    }

    .error-state .material-icons-round {
        font-size: 48px;
        color: var(--danger-color);
    }

    .error-state button {
        padding: 8px 16px;
        border-radius: 8px;
        background: var(--primary-color);
        border: none;
        color: white;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .error-state button:hover {
        opacity: 0.8;
    }
`;

style.textContent += errorStyles;

// Initialize market cards when DOM is loaded
window.addEventListener('DOMContentLoaded', window.initializeMarketCards);
