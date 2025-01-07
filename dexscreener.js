// Token configuration for trending cards
window.TRENDING_TOKENS = {};

// Function to fetch trending tokens from DexScreener
window.fetchTrendingTokens = async function() {
    try {
        // Fetch token boosts from DexScreener
        const response = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
        const data = await response.json();
        
        // Process only Solana tokens
        const solanaTokens = data.filter(token => token.chainId === 'solana');
        
        // Get market grid and store current scroll position
        const marketGridScroll = document.getElementById('marketGridScroll');
        const currentScrollPosition = marketGridScroll ? marketGridScroll.scrollTop : 0;
        
        // Update TRENDING_TOKENS with new data
        window.TRENDING_TOKENS = {};

        // Process each token
        solanaTokens.forEach(token => {
            // Extract token symbol and name from description
            let symbol = '';
            let name = '';
            
            if (token.description) {
                // Try to extract $SYMBOL from the start of description
                const symbolMatch = token.description.match(/^\$?([A-Za-z0-9]+)/);
                if (symbolMatch) {
                    symbol = symbolMatch[1].toUpperCase(); // Convert to uppercase
                    // Get the rest as name, removing the symbol part
                    name = token.description.replace(/^\$?[A-Za-z0-9]+\s*/, '').trim();
                } else {
                    // If no symbol found in description, use token address
                    symbol = token.tokenAddress.slice(0, 6).toUpperCase();
                    name = symbol; // Use symbol as name instead of description
                }
            } else {
                // Fallback to token address for symbol
                symbol = token.tokenAddress.slice(0, 6).toUpperCase();
                name = symbol; // Use symbol as name
            }
            
            window.TRENDING_TOKENS[symbol] = {
                address: token.tokenAddress,
                name: name || symbol, // Ensure name falls back to symbol
                symbol: symbol,
                description: symbol, // Use symbol as fallback for description
                priceUsd: '0',
                volume24h: 0,
                liquidity: 0,
                priceChange: { h24: 0 }
            };
        });
        
        // Fetch price data for each token
        const pricePromises = Object.values(window.TRENDING_TOKENS).map(async (token) => {
            try {
                const url = `https://api.dexscreener.com/latest/dex/tokens/${token.address}`;
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.pairs && data.pairs.length > 0) {
                    // Find the Solana pair with highest liquidity
                    const solanaPair = data.pairs
                        .filter(pair => pair.chainId === 'solana')
                        .sort((a, b) => parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0))[0];

                    if (solanaPair) {
                        // Update token information from pair data
                        if (solanaPair.baseToken) {
                            token.symbol = solanaPair.baseToken.symbol;
                            // Only update name if it's not just the symbol repeated
                            if (solanaPair.baseToken.name && solanaPair.baseToken.name !== solanaPair.baseToken.symbol) {
                                token.name = solanaPair.baseToken.name;
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
                console.error(`Error fetching price data for ${token.symbol}:`, error);
            }
        });

        // Wait for all price data to be fetched
        await Promise.all(pricePromises);
        
        // Initialize market cards only if they don't exist
        if (marketGridScroll && marketGridScroll.children.length === 0) {
            const tokens = Object.values(window.TRENDING_TOKENS);
            if (tokens.length === 0) return;

            // Calculate how many sets we need to fill viewport plus buffer
            const dummyCard = document.createElement('div');
            dummyCard.className = 'market-card';
            marketGridScroll.appendChild(dummyCard);
            const cardHeight = dummyCard.offsetHeight;
            dummyCard.remove();

            const viewportHeight = marketGridScroll.offsetHeight;
            const setsNeeded = Math.ceil((viewportHeight * 3) / (cardHeight * tokens.length));
            
            // Generate enough cards to fill viewport plus buffer
            const cardsHTML = Array(setsNeeded).fill(tokens.map(token => generateMarketCard(token)).join('')).join('');
            marketGridScroll.innerHTML = cardsHTML;

            // Set initial scroll position to middle
            marketGridScroll.scrollTop = (marketGridScroll.scrollHeight - viewportHeight) / 2;
        } else if (marketGridScroll) {
            // Restore scroll position
            marketGridScroll.scrollTop = currentScrollPosition;
        }
    } catch (error) {
        console.error('Error fetching trending tokens:', error);
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

        // Update title and subtitle
        const titleElement = marketCard.querySelector('.market-pair');
        const subtitleElement = marketCard.querySelector('.market-subtitle');
        if (titleElement) {
            titleElement.textContent = `${formattedSymbol}/SOL`;
        }
        if (subtitleElement) {
            subtitleElement.textContent = token.name || formattedSymbol;
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
            <!-- <img src="https://img.icons8.com/?size=100&id=NgbFFSOCkrnB&format=png&color=FFFFFF" alt="Token Logo" style="width: 24px; height: 24px;"> -->
            <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 5px; margin-left: 5px;">
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
    const trendColor = priceChange >= 0 ? '#00FF88' : '#FF3B69';
    
    // Format symbol with $ prefix
    const formattedSymbol = token.symbol.startsWith('$') ? token.symbol : `$${token.symbol}`;
    
    return `
        <div class="market-card ${trendClass}" data-symbol="${token.symbol}" data-pair-address="${token.pairAddress}">
            <button class="add-to-watchlist ${isInWatchlist ? 'added' : ''}" title="${isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}">
                <span class="material-icons-round">${isInWatchlist ? 'done' : 'add'}</span>
            </button>
            <div class="market-header">
                <div class="market-title-group">
                    <div class="market-title">
                        <span class="material-icons-round market-trend-icon" style="font-size: 16px; color: ${trendColor};">${trendIcon}</span>
                        <span class="market-pair">${formattedSymbol}/SOL</span>
                    </div>
                    <div class="market-subtitle">${token.name && token.name !== token.symbol ? token.name : formattedSymbol}</div>
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

    // Get all current cards and container dimensions
    const cards = marketGridScroll.querySelectorAll('.market-card');
    if (cards.length === 0) return;

    const cardHeight = cards[0].offsetHeight;
    const containerHeight = marketGridScroll.offsetHeight;
    const scrollPosition = marketGridScroll.scrollTop;
    const totalScrollHeight = marketGridScroll.scrollHeight;
        const tokens = Object.values(window.TRENDING_TOKENS);
        if (tokens.length === 0) return;

    // Calculate dynamic threshold based on viewport
    const threshold = containerHeight;
    const setSize = tokens.length;
    
    // If scrolled near the bottom
    if (scrollPosition + containerHeight > totalScrollHeight - threshold) {
        // Calculate how many sets to add based on scroll speed
        const scrollSpeed = Math.abs(marketGridScroll.lastScrollTop - scrollPosition) || 0;
        marketGridScroll.lastScrollTop = scrollPosition;
        const setsToAdd = Math.max(1, Math.floor(scrollSpeed / (cardHeight * setSize)));
        
        // Clone and append sets
        for (let i = 0; i < setsToAdd; i++) {
            const startIdx = (Math.floor(scrollPosition / (cardHeight * setSize)) * setSize) % cards.length;
            const cardsToClone = Array.from(cards).slice(startIdx, startIdx + setSize);
            
            cardsToClone.forEach(card => {
                const clone = card.cloneNode(true);
                marketGridScroll.appendChild(clone);
            });
        }
        
        // Remove excess sets from top
        while (cards.length > setSize * 5) {
            for (let i = 0; i < setSize; i++) {
                cards[i].remove();
            }
            // Adjust scroll position
            marketGridScroll.scrollTop = scrollPosition - (cardHeight * setSize);
        }
    }
    
    // If scrolled near the top
    if (scrollPosition < threshold) {
        // Calculate how many sets to add based on scroll speed
        const scrollSpeed = Math.abs(marketGridScroll.lastScrollTop - scrollPosition) || 0;
        marketGridScroll.lastScrollTop = scrollPosition;
        const setsToAdd = Math.max(1, Math.floor(scrollSpeed / (cardHeight * setSize)));
        
        // Clone and prepend sets
        for (let i = 0; i < setsToAdd; i++) {
            const endIdx = Math.floor((scrollPosition + containerHeight) / (cardHeight * setSize)) * setSize;
            const cardsToClone = Array.from(cards).slice(endIdx - setSize, endIdx);
            
            cardsToClone.reverse().forEach(card => {
                const clone = card.cloneNode(true);
                marketGridScroll.insertBefore(clone, marketGridScroll.firstChild);
            });
            
            // Adjust scroll position to maintain viewport
            marketGridScroll.scrollTop = scrollPosition + (cardHeight * setSize);
        }
        
        // Remove excess sets from bottom
        while (cards.length > setSize * 5) {
            for (let i = 0; i < setSize; i++) {
                cards[cards.length - 1 - i].remove();
            }
        }
    }
}

// Function to initialize market cards
window.initializeMarketCards = function() {
    const marketGridScroll = document.getElementById('marketGridScroll');
    if (!marketGridScroll) return;

    // Initial fetch of trending tokens
    window.fetchTrendingTokens();
    
    // Set up trending update interval (every 30 seconds for token list, 2 seconds for prices)
    const trendingTokensInterval = setInterval(window.fetchTrendingTokens, 30000);
    const trendingDataInterval = setInterval(window.updateTrendingData, 2000);
    
    // Add scroll event listener with throttling for better performance
    let scrollTimeout;
    marketGridScroll.addEventListener('scroll', () => {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(() => {
                handleInfiniteScroll();
                scrollTimeout = null;
            }, 100); // Throttle to 100ms
        }
    });
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        clearInterval(trendingTokensInterval);
        clearInterval(trendingDataInterval);
        marketGridScroll.removeEventListener('scroll', handleInfiniteScroll);
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

// Initialize market cards when DOM is loaded
window.addEventListener('DOMContentLoaded', window.initializeMarketCards);
