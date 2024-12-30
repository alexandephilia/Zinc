// Jupiter API Constants
const JUPITER_API_BASE = 'https://quote-api.jup.ag/v6';
const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/strict';
const JUPITER_PRICE_API = 'https://price.jup.ag/v4';
const DEFAULT_SLIPPAGE_BPS = 50; // 0.5%

// Add new constants for routing
const ROUTE_CONFIG = {
    SLIPPAGE_MAP: {
        DEFAULT: 50,  // 0.5%
        LOW_IMPACT: 30,  // 0.3%
        HIGH_IMPACT: 100 // 1%
    },
    MAX_ACCOUNTS: 64,
    PRIORITY_DEXES: ['Orca', 'Raydium', 'Meteora']
};

class JupiterSwapMenu {
    constructor() {
        this.isOpen = false;
        this.tokens = new Map();
        this.inputToken = null;
        this.outputToken = null;
        this.quoteResponse = null;
        this.debounceTimer = null;
        this.priceSubscription = null;
        this.lastPriceUpdate = null;
        
        // Initialize immediately
        this.initializeElements();
        
        // Load tokens after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }

        // Add global click handler for Jupiter button
        document.addEventListener('click', (e) => {
            const jupiterBtn = e.target.closest('.jupiter-btn');
            if (jupiterBtn) {
                console.log('Jupiter button clicked');
                this.openMenu();
            }
        });
    }

    async init() {
        try {
            console.log('Initializing Jupiter Swap Menu...');
            await this.loadTokenList();
            
            // Set default tokens after list is loaded
            this.inputToken = this.tokens.get('SOL');
            this.outputToken = this.tokens.get('USDC');
            
            if (!this.inputToken || !this.outputToken) {
                console.error('Default tokens not found, setting fallback tokens');
                this.setDefaultTokens();
            }

            // Update UI with token info
            this.updateTokenDisplays();
            this.setupEventListeners();
            
            console.log('Jupiter Swap Menu initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Jupiter Swap:', error);
            // Set default tokens as fallback
            this.setDefaultTokens();
            this.updateTokenDisplays();
            this.setupEventListeners();
        }
    }

    updateTokenDisplays() {
        // Update input token display
        const inputSelect = this.menuContainer.querySelector('[data-token="input"]');
        if (inputSelect) {
            const inputImg = inputSelect.querySelector('img');
            const inputSymbol = inputSelect.querySelector('.token-symbol');
            if (inputImg) inputImg.src = this.inputToken?.logoURI || '';
            if (inputSymbol) inputSymbol.textContent = this.inputToken?.symbol || 'SOL';
        }

        // Update output token display
        const outputSelect = this.menuContainer.querySelector('[data-token="output"]');
        if (outputSelect) {
            const outputImg = outputSelect.querySelector('img');
            const outputSymbol = outputSelect.querySelector('.token-symbol');
            if (outputImg) outputImg.src = this.outputToken?.logoURI || '';
            if (outputSymbol) outputSymbol.textContent = this.outputToken?.symbol || 'USDC';
        }

        // Update balance displays
        const balanceDisplays = this.menuContainer.querySelectorAll('.swap-balance span:first-child');
        balanceDisplays.forEach((el, index) => {
            const token = index === 0 ? this.inputToken : this.outputToken;
            if (el && token) {
                el.textContent = `Balance: 0 ${token.symbol}`;
            }
        });
    }

    async loadTokenList() {
        try {
            const response = await fetch(JUPITER_TOKEN_LIST_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch token list: ${response.status}`);
            }
            
            const tokenList = await response.json();
            
            if (!Array.isArray(tokenList)) {
                throw new Error('Invalid token list format');
            }
            
            // Clear existing tokens
            this.tokens.clear();
            
            // Process and store tokens
            tokenList.forEach(token => {
                if (token.address && token.decimals && token.symbol) {
                this.tokens.set(token.symbol, {
                    mint: token.address,
                    decimals: token.decimals,
                    symbol: token.symbol,
                        name: token.name || token.symbol,
                        logoURI: token.logoURI || ''
                });
                }
            });
            
            if (this.tokens.size === 0) {
                throw new Error('No valid tokens found in response');
            }
            
            console.log(`Loaded ${this.tokens.size} tokens from Jupiter`);
        } catch (error) {
            console.error('Error loading token list:', error);
            // Set some default tokens as fallback
            this.setDefaultTokens();
            throw error;
        }
    }

    setDefaultTokens() {
        // Add SOL and USDC as default tokens
        this.tokens.set('SOL', {
            mint: 'So11111111111111111111111111111111111111112',
            decimals: 9,
            symbol: 'SOL',
            name: 'Solana',
            logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
        });
        
        this.tokens.set('USDC', {
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            decimals: 6,
            symbol: 'USDC',
            name: 'USD Coin',
            logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
        });
    }

    initializeElements() {
        console.log('Initializing elements...');
        
        // Remove existing menu container if it exists
        const existingMenu = document.querySelector('.jupiter-swap-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        this.menuContainer = document.createElement('div');
        this.menuContainer.className = 'jupiter-swap-menu';
        this.menuContainer.innerHTML = `
            <div class="jupiter-swap-overlay"></div>
            <div class="jupiter-swap-content">
                <div class="jupiter-swap-header">
                    <div class="jupiter-swap-title">
                        <img src="https://jup.ag/favicon.ico" alt="Jupiter" class="jupiter-logo">
                        <span>Jupiter Swap</span>
                    </div>
                    <button class="close-swap-btn" aria-label="Close swap menu">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="jupiter-swap-body">
                    <div class="swap-input-group">
                        <div class="swap-input-wrapper">
                            <div class="swap-input-field">
                                <input type="number" 
                                       class="swap-input" 
                                       id="inputAmount"
                                       placeholder="0.00" 
                                       min="0" 
                                       step="any">
                                <div class="input-max">MAX</div>
                            </div>
                            <button class="token-select" data-token="input">
                                <img src="${this.inputToken?.logoURI}" 
                                     alt="${this.inputToken?.symbol}" 
                                     class="token-icon">
                                <span class="token-symbol">${this.inputToken?.symbol}</span>
                                <span class="material-icons-round">expand_more</span>
                            </button>
                        </div>
                        <div class="swap-balance">
                            <span>Balance: 0 ${this.inputToken?.symbol}</span>
                            <span class="swap-price"></span>
                        </div>
                    </div>

                    <button class="swap-direction-btn" aria-label="Swap direction">
                        <span class="material-icons-round">swap_vert</span>
                    </button>

                    <div class="swap-input-group">
                        <div class="swap-input-wrapper">
                            <div class="swap-input-field">
                                <input type="number" 
                                       class="swap-input" 
                                       id="outputAmount"
                                       placeholder="0.00" 
                                       disabled>
                            </div>
                            <button class="token-select" data-token="output">
                                <img src="${this.outputToken?.logoURI}" 
                                     alt="${this.outputToken?.symbol}" 
                                     class="token-icon">
                                <span class="token-symbol">${this.outputToken?.symbol}</span>
                                <span class="material-icons-round">expand_more</span>
                            </button>
                        </div>
                        <div class="swap-balance">
                            <span>Balance: 0 ${this.outputToken?.symbol}</span>
                            <span class="swap-price"></span>
                        </div>
                    </div>

                    <div class="swap-details">
                        <div class="swap-route-info">
                            <div class="route-header">
                                <span>Route</span>
                                <button class="route-refresh" aria-label="Refresh route">
                                    <span class="material-icons-round">refresh</span>
                                </button>
                            </div>
                            <div class="route-path"></div>
                        </div>
                        <div class="swap-detail-item">
                            <span>Price Impact</span>
                            <span class="value price-impact">--%</span>
                        </div>
                        <div class="swap-detail-item">
                            <span>Minimum Received</span>
                            <span class="value min-received">-- ${this.outputToken?.symbol}</span>
                        </div>
                        <div class="swap-detail-item">
                            <span>Network Fee</span>
                            <span class="value network-fee">~0.00001 SOL</span>
                        </div>
                    </div>

                    <button class="swap-execute-btn" disabled>
                        <span class="btn-text">Connect Wallet</span>
                        <div class="loading-spinner"></div>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(this.menuContainer);
        
        // Cache DOM elements
        this.inputAmountEl = this.menuContainer.querySelector('#inputAmount');
        this.outputAmountEl = this.menuContainer.querySelector('#outputAmount');
        this.priceImpactEl = this.menuContainer.querySelector('.price-impact');
        this.minReceivedEl = this.menuContainer.querySelector('.min-received');
        this.routePathEl = this.menuContainer.querySelector('.route-path');
        this.executeBtn = this.menuContainer.querySelector('.swap-execute-btn');
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');

        // Menu close handlers
        const closeBtn = this.menuContainer.querySelector('.close-swap-btn');
        const overlay = this.menuContainer.querySelector('.jupiter-swap-overlay');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Close button clicked');
                this.closeMenu();
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Overlay clicked');
                this.closeMenu();
            });
        }

        // Swap direction button
        const directionBtn = this.menuContainer.querySelector('.swap-direction-btn');
        if (directionBtn) {
            directionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSwapDirection();
            });
        }

        // Input amount changes
        if (this.inputAmountEl) {
            this.inputAmountEl.addEventListener('input', (e) => this.handleAmountInput(e));
        }
        
        // MAX button
        const maxBtn = this.menuContainer.querySelector('.input-max');
        if (maxBtn) {
            maxBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleMaxInput();
            });
        }

        // Route refresh button
        const refreshBtn = this.menuContainer.querySelector('.route-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.refreshQuote();
            });
        }

        // Token select buttons
        this.menuContainer.querySelectorAll('.token-select').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleTokenSelect(btn.dataset.token);
            });
        });

        // Execute button
        if (this.executeBtn) {
            this.executeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleExecuteSwap();
            });
        }

        console.log('Event listeners setup complete');
    }

    async setupPriceSubscription() {
        if (this.priceSubscription) {
            this.priceSubscription.close();
        }

        try {
            // Get initial price
            await this.updatePrice();

            const wsUrl = `wss://price.jup.ag/v4/ws`;
            this.priceSubscription = new WebSocket(wsUrl);

            this.priceSubscription.onopen = () => {
                console.log('Price WebSocket connected');
                const pair = `${this.inputToken.mint}/${this.outputToken.mint}`;
                const subscribeMessage = {
                    type: "subscribe",
                    pairs: [pair]
                };
                this.priceSubscription.send(JSON.stringify(subscribeMessage));
            };

            this.priceSubscription.onmessage = (event) => {
                try {
                const data = JSON.parse(event.data);
                    if (data.type === "price" && data.price) {
                    this.updatePriceDisplay(data.price);
                    }
                } catch (error) {
                    console.error('Error processing price update:', error);
                }
            };

            this.priceSubscription.onerror = (error) => {
                console.error('Price WebSocket error:', error);
                // Fallback to REST API on WebSocket error
                this.updatePrice();
            };
        } catch (error) {
            console.error('Failed to setup price subscription:', error);
            // Fallback to regular price updates
            this.updatePrice();
            setInterval(() => this.updatePrice(), 10000);
        }
    }

    async updatePrice() {
        try {
            const response = await fetch(`${JUPITER_PRICE_API}/price?ids=${this.inputToken.mint},${this.outputToken.mint}`);
            if (!response.ok) throw new Error('Failed to fetch price');
            
            const data = await response.json();
            const inputPrice = data.data[this.inputToken.mint]?.price || 0;
            const outputPrice = data.data[this.outputToken.mint]?.price || 0;
            
            if (inputPrice && outputPrice) {
                const price = outputPrice / inputPrice;
                this.updatePriceDisplay(price);
            }
        } catch (error) {
            console.error('Error fetching price:', error);
        }
    }

    updatePriceDisplay(price) {
        const priceElements = this.menuContainer.querySelectorAll('.swap-price');
        const formattedPrice = price < 0.01 ? price.toFixed(8) : price.toFixed(6);
        
        priceElements.forEach(el => {
            el.textContent = `1 ${this.inputToken.symbol} ≈ ${formattedPrice} ${this.outputToken.symbol}`;
        });

        // Animate price change if there was a previous price
        if (this.lastPriceUpdate !== null && this.lastPriceUpdate !== price) {
            const priceChange = price > this.lastPriceUpdate ? 'positive' : 'negative';
            priceElements.forEach(el => {
                el.classList.remove('price-up', 'price-down');
                el.classList.add(`price-${priceChange}`);
                setTimeout(() => el.classList.remove(`price-${priceChange}`), 1000);
            });
        }
        
        this.lastPriceUpdate = price;
    }

    async getQuote(inputAmount) {
        try {
            if (!inputAmount || isNaN(inputAmount) || inputAmount <= 0) {
                this.resetSwapDetails();
                return null;
            }

            if (!this.inputToken || !this.outputToken) {
                throw new Error('Tokens not initialized');
            }

            // Calculate amount in base units
            const amount = this.toBaseUnits(inputAmount, this.inputToken.decimals);

            // Build route parameters
            const params = new URLSearchParams({
                inputMint: this.inputToken.mint,
                outputMint: this.outputToken.mint,
                amount: amount,
                slippageBps: DEFAULT_SLIPPAGE_BPS,
                feeBps: 0,
                onlyDirectRoutes: false,
                asLegacyTransaction: false
            });

            console.log('Fetching quote with params:', params.toString());
            const response = await fetch(`${JUPITER_API_BASE}/quote?${params}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Quote API error:', errorData);
                throw new Error(errorData.message || 'Failed to fetch quote');
            }
            
            const data = await response.json();
            console.log('Quote response:', data);

            if (!data || !data.outAmount) {
                throw new Error('Invalid quote response');
            }

            // Store the quote response
            this.quoteResponse = data;

            // Update UI with quote data
            this.updateSwapDetails(this.quoteResponse);
            
            return this.quoteResponse;
        } catch (error) {
            console.error('Error fetching quote:', error);
            this.showError('Failed to fetch quote. Please try again.');
            this.resetSwapDetails();
            return null;
        }
    }

    calculateAdaptiveSlippage(inputAmount) {
        const amount = parseFloat(inputAmount);
        if (isNaN(amount)) return ROUTE_CONFIG.SLIPPAGE_MAP.DEFAULT;

        // Convert to USD value for calculation (using cached price)
        const usdValue = amount * (this.lastPriceUpdate || 0);

        // Adjust slippage based on amount
        if (usdValue > 10000) { // Large trades > $10k
            return ROUTE_CONFIG.SLIPPAGE_MAP.HIGH_IMPACT;
        } else if (usdValue < 100) { // Small trades < $100
            return ROUTE_CONFIG.SLIPPAGE_MAP.LOW_IMPACT;
        }
        return ROUTE_CONFIG.SLIPPAGE_MAP.DEFAULT;
    }

    async optimizeRoute(quoteData) {
        if (!quoteData || !quoteData.routePlan) return quoteData;

        // Clone the quote data to avoid mutations
        const optimizedQuote = { ...quoteData };

        try {
            // Get market data for involved tokens
            const marketData = await this.getMarketData(optimizedQuote.routePlan);
            
            // Enhance route with market data
            optimizedQuote.routePlan = optimizedQuote.routePlan.map(step => ({
                ...step,
                marketInfo: marketData[step.label] || {}
            }));

            // Calculate additional route metrics
            optimizedQuote.routeMetrics = this.calculateRouteMetrics(optimizedQuote);

            return optimizedQuote;
        } catch (error) {
            console.error('Error optimizing route:', error);
            return quoteData; // Return original quote if optimization fails
        }
    }

    async getMarketData(routePlan) {
        const dexes = new Set(routePlan.map(step => step.label));
        const marketData = {};

        try {
            // Fetch market data for each DEX in parallel
            const promises = Array.from(dexes).map(async dex => {
                const response = await fetch(`${JUPITER_API_BASE}/market-info?dex=${dex}`);
                if (!response.ok) throw new Error(`Failed to fetch market data for ${dex}`);
                const data = await response.json();
                marketData[dex] = data;
            });

            await Promise.all(promises);
            return marketData;
        } catch (error) {
            console.error('Error fetching market data:', error);
            return {};
        }
    }

    calculateRouteMetrics(quote) {
        const metrics = {
            totalFees: 0,
            averageSlippage: 0,
            routeComplexity: quote.routePlan.length,
            estimatedTime: 0
        };

        // Calculate total fees and average slippage
        quote.routePlan.forEach(step => {
            metrics.totalFees += parseFloat(step.marketInfo.fee || 0);
            metrics.averageSlippage += parseFloat(step.marketInfo.slippage || 0);
            metrics.estimatedTime += step.marketInfo.avgConfirmationTime || 500; // Default 500ms
        });

        metrics.averageSlippage /= quote.routePlan.length;
        
        return metrics;
    }

    async getSwapTransaction(quoteResponse) {
        try {
            const response = await fetch(`${JUPITER_API_BASE}/swap`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quoteResponse,
                    userPublicKey: this.walletPublicKey, // Will be set when wallet is connected
                    wrapUnwrapSOL: true,
                    // Add more parameters as needed
                    feeAccount: null,
                    computeUnitPriceMicroLamports: null,
                    asLegacyTransaction: false
                })
            });

            if (!response.ok) throw new Error('Failed to get swap transaction');
            return await response.json();
        } catch (error) {
            console.error('Error getting swap transaction:', error);
            throw error;
        }
    }

    updateSwapDetails(quoteData) {
        if (!quoteData) return;

        // Update output amount
        const outputAmount = this.fromBaseUnits(quoteData.outAmount, this.outputToken.decimals);
        this.outputAmountEl.value = outputAmount;

        // Update price impact
        const priceImpact = parseFloat(quoteData.priceImpactPct || 0);
        this.priceImpactEl.textContent = `${priceImpact.toFixed(2)}%`;
        this.priceImpactEl.className = `value price-impact ${priceImpact > 1 ? 'warning' : ''}`;

        // Update minimum received
        const minReceived = this.fromBaseUnits(quoteData.otherAmountThreshold, this.outputToken.decimals);
        this.minReceivedEl.textContent = `${minReceived} ${this.outputToken.symbol}`;

        // Update route visualization with the route plan
        this.updateRouteVisualization(quoteData.routePlan || []);
    }

    updateRouteVisualization(routePlan) {
        console.log('Updating route visualization with:', routePlan);  // Debug log
        
        if (!routePlan || !routePlan.length) {
            this.routePathEl.innerHTML = `
                <div class="route-loading">
                    <span class="material-icons-round">route</span>
                    Finding best route...
                </div>`;
            return;
        }

        let routeHtml = `
            <div class="route-overview">
                <div class="route-overview-item">
                    <span class="overview-label">Route Type</span>
                    <span class="overview-value">${routePlan.length === 1 ? 'Direct Swap' : 'Split Route'}</span>
                </div>
                <div class="route-overview-item">
                    <span class="overview-label">Total Steps</span>
                    <span class="overview-value">${routePlan.length} hop${routePlan.length > 1 ? 's' : ''}</span>
                </div>
            </div>
        `;
        
        routePlan.forEach((step, index) => {
            const isLast = index === routePlan.length - 1;
            const dexLabel = step.swapInfo?.label || step.label || 'Unknown';
            const percentage = step.swapInfo?.percent || step.percent || 100;
            const fee = step.swapInfo?.fee || step.fee || 0;
            
            // Get token symbols for this step
            const inToken = this.getTokenByMint(step.swapInfo?.inputMint || step.inputMint)?.symbol || '?';
            const outToken = this.getTokenByMint(step.swapInfo?.outputMint || step.outputMint)?.symbol || '?';
            
            routeHtml += `
                <div class="route-step ${ROUTE_CONFIG.PRIORITY_DEXES.includes(dexLabel) ? 'priority' : ''}">
                    <div class="route-step-header">
                        <div class="route-dex">
                            <div class="dex-badge ${ROUTE_CONFIG.PRIORITY_DEXES.includes(dexLabel) ? 'verified' : ''}">
                                ${dexLabel}
                                ${step.swapInfo?.verified ? '<span class="verified-badge">✓</span>' : ''}
                            </div>
                            ${percentage !== 100 ? `
                                <div class="split-percentage">
                                    <span class="material-icons-round">call_split</span>
                                    ${percentage}%
                                </div>
                            ` : ''}
                        </div>
                        <div class="step-metrics">
                            <span class="metric-item" title="Fee">
                                <span class="material-icons-round">payments</span>
                                ${this.formatFees(fee)}%
                            </span>
                        </div>
                    </div>
                    <div class="route-tokens">
                        <div class="token-pair">
                            <span class="token-amount">${inToken}</span>
                            <span class="material-icons-round">arrow_forward</span>
                            <span class="token-amount">${outToken}</span>
                        </div>
                    </div>
                    ${!isLast ? `
                        <div class="route-connector">
                            <div class="connector-line"></div>
                            <div class="connector-icon">
                                <span class="material-icons-round">arrow_downward</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        // Add route summary with price impact
        const priceImpact = this.quoteResponse?.priceImpactPct || 0;
        routeHtml += `
            <div class="route-summary">
                <div class="summary-header">
                    <span class="material-icons-round">analytics</span>
                    Route Analytics
                </div>
                <div class="summary-grid">
                    <div class="route-metric">
                        <span class="metric-label">Price Impact</span>
                        <span class="metric-value ${parseFloat(priceImpact) > 1 ? 'warning' : ''}">${parseFloat(priceImpact).toFixed(2)}%</span>
                    </div>
                    <div class="route-metric">
                        <span class="metric-label">Route Length</span>
                        <span class="metric-value">${routePlan.length} hop${routePlan.length > 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>
        `;

        console.log('Setting route HTML:', routeHtml);  // Debug log
        this.routePathEl.innerHTML = routeHtml;
    }

    // Add helper method to get token by mint address
    getTokenByMint(mintAddress) {
        for (const [_, token] of this.tokens) {
            if (token.mint === mintAddress) {
                return token;
            }
        }
        return null;
    }

    formatStepMetrics(marketInfo) {
        if (!marketInfo || Object.keys(marketInfo).length === 0) return '';
        
        return `
            <div class="step-metrics">
                <span class="metric-item" title="Liquidity">
                    <span class="material-icons-round">water_drop</span>
                    ${this.formatLiquidity(marketInfo.liquidity)}
                </span>
                <span class="metric-item" title="Fee">
                    <span class="material-icons-round">payments</span>
                    ${this.formatFees(marketInfo.fee)}
                </span>
            </div>
        `;
    }

    getDexClass(dexName) {
        const dex = dexName.toLowerCase();
        if (ROUTE_CONFIG.PRIORITY_DEXES.map(d => d.toLowerCase()).includes(dex)) {
            return 'priority-dex';
        }
        return '';
    }

    formatPercentage(value) {
        return parseFloat(value || 0).toFixed(1);
    }

    formatLiquidity(value) {
        if (!value) return '0';
        const num = parseFloat(value);
        if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toFixed(1);
    }

    formatFees(value) {
        return parseFloat(value || 0).toFixed(4);
    }

    formatTime(ms) {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }

    handleAmountInput(event) {
        const value = event.target.value;
        
        // Clear existing timer
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        
        // Debounce API calls
        this.debounceTimer = setTimeout(async () => {
            if (value && !isNaN(value) && value > 0) {
                this.executeBtn.classList.add('loading');
                await this.getQuote(value);
                this.executeBtn.classList.remove('loading');
            } else {
                this.resetSwapDetails();
            }
        }, 500);
    }

    handleSwapDirection() {
        // Swap tokens
        [this.inputToken, this.outputToken] = [this.outputToken, this.inputToken];
        
        // Update UI
        const inputSelect = this.menuContainer.querySelector('[data-token="input"]');
        const outputSelect = this.menuContainer.querySelector('[data-token="output"]');
        
        // Update token displays
        this.updateTokenDisplay(inputSelect, this.inputToken);
        this.updateTokenDisplay(outputSelect, this.outputToken);
        
        // Update price subscription for new pair
        this.setupPriceSubscription();
        
        // Clear amounts and get new quote
        const inputAmount = this.inputAmountEl.value;
        if (inputAmount) {
            this.getQuote(inputAmount);
        }
    }

    updateTokenDisplay(element, token) {
        if (!element || !token) return;
        
        const img = element.querySelector('img');
        const symbol = element.querySelector('.token-symbol');
        
        if (img) img.src = token.logoURI;
        if (symbol) symbol.textContent = token.symbol;
        
        // Update related balance display
        const balanceContainer = element.closest('.swap-input-group').querySelector('.swap-balance span:first-child');
        if (balanceContainer) {
            balanceContainer.textContent = `Balance: 0 ${token.symbol}`;
        }
    }

    handleMaxInput() {
        // This would be implemented when wallet connection is added
        console.log('Max input clicked');
    }

    handleTokenSelect(type) {
        // This would open a token selection modal with this.tokens
        console.log('Token select clicked:', type, 'Available tokens:', this.tokens);
    }

    async handleExecuteSwap() {
        if (!this.quoteResponse) return;
        
        try {
            this.executeBtn.classList.add('loading');
            
            // Get the swap transaction
            const swapResult = await this.getSwapTransaction(this.quoteResponse);
            
            // Here we would:
            // 1. Sign the transaction with the wallet
            // 2. Send the transaction to the network
            // 3. Wait for confirmation
            // 4. Show success/error message
            
            console.log('Swap transaction:', swapResult);
            
        } catch (error) {
            console.error('Error executing swap:', error);
            this.showError('Failed to execute swap. Please try again.');
        } finally {
            this.executeBtn.classList.remove('loading');
        }
    }

    refreshQuote() {
        const inputAmount = this.inputAmountEl.value;
        if (inputAmount) {
            this.getQuote(inputAmount);
        }
    }

    resetSwapDetails() {
        this.outputAmountEl.value = '';
        this.priceImpactEl.textContent = '--%';
        this.minReceivedEl.textContent = `-- ${this.outputToken?.symbol}`;
        this.routePathEl.innerHTML = '';
        this.quoteResponse = null;
    }

    showError(message) {
        // Implement error toast/notification
        console.error(message);
    }

    // Utility functions for token decimal conversion
    toBaseUnits(amount, decimals) {
        return Math.floor(parseFloat(amount) * Math.pow(10, decimals)).toString();
    }

    fromBaseUnits(amount, decimals) {
        return (parseInt(amount) / Math.pow(10, decimals)).toFixed(decimals);
    }

    openMenu() {
        if (!this.menuContainer) {
            console.error('Menu container not initialized');
            return;
        }
        console.log('Opening Jupiter Swap menu');
        
        // Ensure menu container exists in DOM
        if (!document.body.contains(this.menuContainer)) {
            console.log('Reinserting menu container');
            document.body.appendChild(this.menuContainer);
        }
        
        // Add active class with a slight delay to ensure smooth animation
        requestAnimationFrame(() => {
            this.menuContainer.classList.add('active');
            this.isOpen = true;
            document.body.style.overflow = 'hidden';
            this.setupPriceSubscription();
        });
    }

    closeMenu() {
        if (!this.menuContainer) {
            console.error('Menu container not initialized');
            return;
        }
        console.log('Closing Jupiter Swap menu');
        
        this.menuContainer.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
        this.resetSwapDetails();
        
        if (this.priceSubscription) {
            this.priceSubscription.close();
            this.priceSubscription = null;
        }
    }
}

// Initialize the Jupiter Swap Menu
document.addEventListener('DOMContentLoaded', () => {
    window.jupiterSwapMenu = new JupiterSwapMenu();
});
