// Function to show DexScreener chart (unified functionality)
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

    // Update chart title with analysis button
    const chartTitle = document.querySelector('.chart-title');
    if (chartTitle) {
        const shortContractAddress = pair.baseToken.address.slice(0, 6) + '...' + pair.baseToken.address.slice(-4);
        const shortPairAddress = pair.pairAddress.slice(0, 6) + '...' + pair.pairAddress.slice(-4);
        const volume24h = formatNumber(parseFloat(pair.volume.h24));
        const mcap = formatNumber(parseFloat(pair.fdv));
        const priceChange24h = parseFloat(pair.priceChange.h24);

        chartTitle.innerHTML = `
            <div class="token-info-wrapper">
                <div class="token-info-grid">
                    <div class="token-header">
                        <div class="name-and-metrics">
                            <span class="token-name">${pair.baseToken.name || pair.baseToken.symbol}</span>
                            <div class="token-metrics">
                                <div class="metric-badge change ${priceChange24h >= 0 ? 'positive' : 'negative'}">
                                    <span class="metric-label">24h</span>
                                    <span class="metric-value">${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%</span>
                                </div>
                                <div class="metric-badge volume">
                                    <span class="metric-label">24h Vol</span>
                                    <span class="metric-value">$${volume24h}</span>
                                </div>
                                <div class="metric-badge mcap">
                                    <span class="metric-label">MCap</span>
                                    <span class="metric-value">$${mcap}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="token-info-group">
                        <div class="token-addresses">
                            <div class="address-badge token-badge">
                                <span class="badge-label">Token</span>
                                <span class="badge-value">${shortContractAddress}</span>
                                <button class="icon-btn copy-btn contract-copy" data-copy="${pair.baseToken.address}" title="Copy token address">
                                    <span class="material-icons-round">content_copy</span>
                                </button>
                            </div>
                            <div class="address-badge pair-badge">
                                <span class="badge-label">Pair</span>
                                <span class="badge-value">${shortPairAddress}</span>
                                <button class="icon-btn copy-btn pair-copy" data-copy="${pair.pairAddress}" title="Copy pair address">
                                    <span class="material-icons-round">content_copy</span>
                                </button>
                            </div>
                            <button class="analyze-btn" onclick="showTokenAnalysis('${pair.baseToken.address}', '${pair.baseToken.symbol}')" title="Analyze Token Safety">
                                <span class="material-icons-round">security</span>
                            </button>
                        </div>
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

    // Add styles for the analyze button
    const styles = document.createElement('style');
    styles.textContent = `
        .analyze-btn {
            margin-left: 3px;
            padding: 4px;
            border-radius: 6px;
            background: rgba(41, 98, 255, 0.1);
            color: #2962ff;
            transition: all 0.2s ease;
        }

        .analyze-btn:hover {
            background: rgba(41, 98, 255, 0.2);
            transform: translateY(-1px);
        }

        .analyze-btn .material-icons-round {
            font-size: 15px;
        }
    `;
    document.head.appendChild(styles);
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

// Helper function to format numbers
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

// Function to format price with consistent decimals
function formatTokenPrice(price) {
    if (!price) return '$0.00000000';
    
    const numPrice = parseFloat(price);
    if (numPrice === 0) return '$0.00000000';
    
    // For very small numbers (less than 0.000001)
    if (numPrice < 0.000001) {
        return numPrice.toExponential(8);
    }
    
    // For all other numbers, show 8 decimal places consistently
    return numPrice.toFixed(8);
}

// Function to show calculator for pair
window.showCalculatorForPair = function(pairAddress, symbol) {
    // Clear any existing interval first
    if (window.calculatorInterval) {
        clearInterval(window.calculatorInterval);
        window.calculatorInterval = null;
    }

    const calculator = document.querySelector('.pair-calculator');
    const tokenSymbol = document.querySelector('.calc-symbol');
    let currentPrice = 0;
    let currentPair = null;
    let lastUpdateTimestamp = 0;
    const MIN_UPDATE_INTERVAL = 250; // Minimum time between updates

    // Create calculator toggle button if it doesn't exist
    if (!document.querySelector('.calculator-toggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'calculator-toggle';
        toggleBtn.innerHTML = `
            <span class="material-icons-round">calculate</span>
        `;
        document.body.appendChild(toggleBtn);

        // Create backdrop if it doesn't exist
        if (!document.querySelector('.calculator-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.className = 'calculator-backdrop';
            document.body.appendChild(backdrop);

            // Close calculator when clicking backdrop
            backdrop.addEventListener('click', () => {
                calculator.classList.remove('expanded');
                backdrop.classList.remove('visible');
                toggleBtn.classList.remove('hidden');
            });
        }

        // Toggle calculator on button click
        toggleBtn.addEventListener('click', () => {
            calculator.classList.add('expanded');
            document.querySelector('.calculator-backdrop').classList.add('visible');
            toggleBtn.classList.add('hidden');
        });
    }

    // Show calculator
    calculator.style.display = 'block';

    // Update token symbol
    if (tokenSymbol) {
        tokenSymbol.textContent = symbol;
    }

    // Function to update price with rate limiting and error handling
    async function updatePrice() {
        const now = Date.now();
        if (now - lastUpdateTimestamp < MIN_UPDATE_INTERVAL) {
            return;
        }

        try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            
            if (data.pair) {
                const newPrice = parseFloat(data.pair.priceUsd);
                if (newPrice !== currentPrice || currentPrice === 0) {
                    currentPrice = newPrice;
                    currentPair = data.pair;
                    lastUpdateTimestamp = now;
                    
                    const tokenInput = document.getElementById('tokenAmount');
                    const usdInput = document.getElementById('usdAmount');
                    
                    if (tokenInput.value) {
                        const rawValue = tokenInput.value.replace(/,/g, '');
                        const tokenAmount = parseFloat(rawValue);
                        if (!isNaN(tokenAmount)) {
                            const usdValue = tokenAmount * currentPrice;
                            usdInput.value = Number(usdValue).toLocaleString('en-US', {
                                minimumFractionDigits: 8,
                                maximumFractionDigits: 8
                            });
                            tokenInput.value = tokenAmount.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 12
                            });
                        }
                    } else if (usdInput.value) {
                        const rawValue = usdInput.value.replace(/,/g, '');
                        const usdAmount = parseFloat(rawValue);
                        if (!isNaN(usdAmount)) {
                            const tokenValue = usdAmount / currentPrice;
                            tokenInput.value = Number(tokenValue).toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 12
                            });
                            usdInput.value = usdAmount.toLocaleString('en-US', {
                                minimumFractionDigits: 8,
                                maximumFractionDigits: 8
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error updating calculator price:', error);
        }
    }

    // Initial price update
    updatePrice();

    // Set up input handlers if not already set
    const tokenInput = document.getElementById('tokenAmount');
    const usdInput = document.getElementById('usdAmount');

    if (!tokenInput.hasEventListener) {
        tokenInput.addEventListener('input', () => {
            if (!tokenInput.value) {
                usdInput.value = '';
                return;
            }
            const rawValue = tokenInput.value.replace(/,/g, '');
            const tokenAmount = parseFloat(rawValue);
            if (!isNaN(tokenAmount)) {
                const usdValue = tokenAmount * currentPrice;
                // Format USD value with consistent 8 decimals
                usdInput.value = Number(usdValue).toLocaleString('en-US', {
                    minimumFractionDigits: 8,
                    maximumFractionDigits: 8
                });
                // Format token input with consistent decimals
                tokenInput.value = tokenAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 12
                });
            }
        });
        tokenInput.hasEventListener = true;
    }

    if (!usdInput.hasEventListener) {
        usdInput.addEventListener('input', () => {
            if (!usdInput.value) {
                tokenInput.value = '';
                return;
            }
            const rawValue = usdInput.value.replace(/,/g, '');
            const usdAmount = parseFloat(rawValue);
            if (!isNaN(usdAmount)) {
                const tokenValue = usdAmount / currentPrice;
                // Format token value with consistent decimals
                tokenInput.value = Number(tokenValue).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 12
                });
                // Format USD input with consistent 8 decimals
                usdInput.value = usdAmount.toLocaleString('en-US', {
                    minimumFractionDigits: 8,
                    maximumFractionDigits: 8
                });
            }
        });
        usdInput.hasEventListener = true;
    }

    // Start price updates with rate limiting
    window.calculatorInterval = setInterval(updatePrice, 250);
}

// Function to hide calculator
window.hideCalculator = function() {
    // Clear the interval first
    if (window.calculatorInterval) {
        clearInterval(window.calculatorInterval);
        window.calculatorInterval = null;
    }

    // Reset calculator state
    const calculator = document.querySelector('.pair-calculator');
    const calculatorToggle = document.querySelector('.calculator-toggle');
    const backdrop = document.querySelector('.calculator-backdrop');
    const tokenInput = document.getElementById('tokenAmount');
    const usdInput = document.getElementById('usdAmount');
    
    // Clear input values
    if (tokenInput) tokenInput.value = '';
    if (usdInput) usdInput.value = '';
    
    // Hide calculator
    if (calculator) {
        calculator.style.display = 'none';
        calculator.classList.remove('expanded');
    }
    
    // Remove mobile elements
    if (calculatorToggle) {
        calculatorToggle.remove();
    }
    if (backdrop) {
        backdrop.classList.remove('visible');
        backdrop.remove();
    }
}

// Function to get token holders
async function getTokenHolders(mintAddress) {
    // RPC endpoints with fallback
    const rpcEndpoints = [
        'https://mainnet.helius-rpc.com/?api-key=864eec10-224c-49c8-a275-fcd031e4c2d7',
        'https://go.getblock.io/285683280f0e4402aed5d9a7788d8bef',
        'https://api.mainnet-beta.solana.com'
    ];

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < rpcEndpoints.length; i++) {
        try {
            const rpcEndpoint = rpcEndpoints[i];
            console.log(`Trying RPC endpoint ${i + 1}...`);

            // Get largest token accounts with retry logic
            let retryCount = 0;
            let data;
            
            while (retryCount < 3) {
                try {
        const response = await fetch(rpcEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'get-largest-accounts',
                method: 'getTokenLargestAccounts',
                params: [mintAddress]
            })
        });
        
                    data = await response.json();
                    
                    if (data.error) {
                        if (data.error.code === 429 || data.error.code === -32429) {
                            console.log('Rate limit hit, retrying...');
                            await delay(1000 * (retryCount + 1)); // Exponential backoff
                            retryCount++;
                            continue;
                        }
                        throw new Error(data.error.message);
                    }
                    
                    break; // Success, exit retry loop
                } catch (error) {
                    console.error(`Attempt ${retryCount + 1} failed:`, error);
                    if (retryCount === 2) throw error; // Throw on final retry
                    retryCount++;
                    await delay(1000 * (retryCount + 1));
                }
            }

            if (!data?.result?.value) {
            throw new Error('Failed to fetch token holders');
        }

            // Get token supply with retry logic
            retryCount = 0;
            let supplyData;
            
            while (retryCount < 3) {
                try {
        const supplyResponse = await fetch(rpcEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'get-supply',
                method: 'getTokenSupply',
                params: [mintAddress]
            })
        });

                    supplyData = await supplyResponse.json();
                    
                    if (supplyData.error) {
                        if (supplyData.error.code === 429 || supplyData.error.code === -32429) {
                            console.log('Rate limit hit, retrying...');
                            await delay(1000 * (retryCount + 1));
                            retryCount++;
                            continue;
                        }
                        throw new Error(supplyData.error.message);
                    }
                    
                    break; // Success, exit retry loop
                } catch (error) {
                    console.error(`Attempt ${retryCount + 1} failed:`, error);
                    if (retryCount === 2) throw error;
                    retryCount++;
                    await delay(1000 * (retryCount + 1));
                }
            }

        const totalSupply = supplyData.result?.value?.amount || 0;
            const decimals = supplyData.result?.value?.decimals || 0;

        // Sort holders by amount and calculate percentages
        const holders = data.result.value
            .map(holder => ({
                address: holder.address,
                    amount: parseFloat(holder.amount) / Math.pow(10, decimals),
                percentage: ((parseFloat(holder.amount) / totalSupply) * 100).toFixed(2)
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);  // Get top 10 holders

        return {
            holders,
                totalSupply: totalSupply / Math.pow(10, decimals)
        };

    } catch (error) {
            console.error(`RPC endpoint ${i + 1} failed:`, error);
            if (i === rpcEndpoints.length - 1) {
                throw new Error('All RPC endpoints failed');
            }
            // Try next RPC endpoint
            await delay(1000);
            continue;
        }
    }
}

// Add this at the top with other window functions
window.isAnalysisModalLoading = false;

// Function to show token analysis modal
window.showTokenAnalysis = async function(contractAddress, symbol) {
    // Prevent opening if already loading
    if (window.isAnalysisModalLoading) {
        console.log('Analysis already in progress...');
        return;
    }

    window.isAnalysisModalLoading = true;

    let modal = document.querySelector('.zinc-token-analysis-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'zinc-token-analysis-modal';
        document.body.appendChild(modal);
    }

    // Show loading state with updated design
    modal.innerHTML = `
        <div class="zinc-modal-content">
            <div class="zinc-modal-header">
                <div class="zinc-header-content">
                    <h2>
                        <span class="material-icons-round">security</span>
                        ${symbol}
                    </h2>
                    <div class="zinc-header-details">
                        <div class="zinc-contract-info">
                            <span class="zinc-label">Contract:</span>
                            <span class="zinc-value">${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}</span>
                            <button class="zinc-copy-btn" data-copy="${contractAddress}">
                                <span class="material-icons-round">content_copy</span>
                            </button>
                        </div>
                    </div>
                </div>
                <button class="zinc-close-modal">
                    <span class="material-icons-round">close</span>
                </button>
            </div>
            <div class="zinc-modal-body">
                <div class="zinc-analysis-loading">
                    <div class="zinc-spinner"></div>
                    <p>Analyzing token safety, metrics, and holders...</p>
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    
    try {
        // Parallel fetch of all data
        const [accountInfo, tokenData, holdersData] = await Promise.all([
            // 1. Get token account info
            fetch('https://mainnet.helius-rpc.com/?api-key=864eec10-224c-49c8-a275-fcd031e4c2d7', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getAccountInfo',
                    params: [contractAddress, { encoding: 'jsonParsed' }]
                })
            }).then(r => r.json()),
            
            // 2. Get DexScreener data
            fetch(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`).then(r => r.json()),
            
            // 3. Get holders data
            getTokenHolders(contractAddress)
        ]);

        const mintInfo = accountInfo.result?.value?.data?.parsed?.info;
        
        // Find the best Solana pair by liquidity
        const solanaPairs = tokenData.pairs?.filter(p => p.chainId === 'solana') || [];
        const bestPair = solanaPairs.sort((a, b) => 
            parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)
        )[0];
        
        if (!bestPair) {
            throw new Error('No trading pair found');
        }

        // Calculate safety score
        let safetyScore = 0;
        const liquidityUsd = parseFloat(bestPair.liquidity?.usd || 0);
        const volume24h = parseFloat(bestPair.volume?.h24 || 0);
        const txCount24h = (bestPair.txns?.h24?.buys || 0) + (bestPair.txns?.h24?.sells || 0);

        // Validate the data before using it
        if (!holdersData?.holders?.length || !holdersData.totalSupply) {
            throw new Error('Invalid holders data received');
        }

        // Calculate total percentage held by top 10 holders
        const totalTopHoldersPercentage = holdersData.holders.reduce((sum, holder) => {
            const percentage = parseFloat(holder.percentage);
            return isNaN(percentage) ? sum : sum + percentage;
        }, 0);

        if (isNaN(totalTopHoldersPercentage) || totalTopHoldersPercentage === Infinity) {
            throw new Error('Invalid holder percentages calculated');
        }

        // Holder concentration check (40 points)
        // Less concentration = more points
        if (totalTopHoldersPercentage < 30) safetyScore += 40;        // Extremely distributed
        else if (totalTopHoldersPercentage < 50) safetyScore += 30;   // Well distributed
        else if (totalTopHoldersPercentage < 70) safetyScore += 20;   // Moderately concentrated
        else if (totalTopHoldersPercentage < 90) safetyScore += 10;   // Highly concentrated
        // else 0 points - Very high concentration (>90%)

        // Mint authority check (20 points)
        if (!mintInfo?.mintAuthority) {
            safetyScore += 20;
        }

        // Liquidity check (20 points)
        if (liquidityUsd > 500000) safetyScore += 20;         // $500K+ is very healthy
        else if (liquidityUsd > 100000) safetyScore += 15;    // $100K+ is good
        else if (liquidityUsd > 50000) safetyScore += 10;     // $50K+ is moderate
        else if (liquidityUsd > 10000) safetyScore += 5;      // $10K+ is minimum

        // Volume check (10 points) - relative to liquidity
        const volumeToLiquidityRatio = (volume24h / liquidityUsd) * 100;
        if (volumeToLiquidityRatio > 100) safetyScore += 10;        // Volume > Liquidity (very active)
        else if (volumeToLiquidityRatio > 50) safetyScore += 7;     // Volume > 50% of Liquidity (active)
        else if (volumeToLiquidityRatio > 20) safetyScore += 5;     // Volume > 20% of Liquidity (moderate)

        // Transaction count check (10 points) - relative to volume
        const avgTradeSize = volume24h / txCount24h;
        const txPerHour = txCount24h / 24;
        if (txPerHour > 50 && avgTradeSize > 100) safetyScore += 10;     // High activity, decent trade size
        else if (txPerHour > 20 && avgTradeSize > 50) safetyScore += 7;  // Moderate activity
        else if (txPerHour > 5 && avgTradeSize > 20) safetyScore += 5;   // Low but acceptable

        // Prepare analysis data
        const analysis = {
            mintAuthority: mintInfo?.mintAuthority ? 'Active' : 'Revoked',
            freezeAuthority: mintInfo?.freezeAuthority ? 'Active' : 'Revoked',
            supply: formatNumber(holdersData.totalSupply),
            liquidityStatus: {
                amount: liquidityUsd,
                txCount24h: txCount24h,
                volume24h: volume24h
            },
            safetyScore: safetyScore,
            holders: holdersData.holders,
            totalSupply: holdersData.totalSupply,
            topHoldersPercentage: totalTopHoldersPercentage.toFixed(2)
        };

        // Update modal with analysis results
        const modalBody = modal.querySelector('.zinc-modal-body');

        // Generate dynamic risk analysis message
        function generateRiskAnalysis(analysis) {
            const messages = [];
            const notices = [];
            
            // Only keep critical liquidity warnings in messages
            if (analysis.liquidityStatus.amount < 10000) {
                messages.push('<span class="icon-text critical"><span class="material-icons-round">error</span>CRITICAL: Extremely low liquidity, high manipulation risk</span>');
            }

            // Holder Concentration Analysis
            if (parseFloat(analysis.topHoldersPercentage) > 80) {
                messages.push('<span class="icon-text critical"><span class="material-icons-round">group_off</span>DANGER: Extremely concentrated token holdings</span>');
            } else if (parseFloat(analysis.topHoldersPercentage) > 60) {
                messages.push('<span class="icon-text warning"><span class="material-icons-round">groups</span>High holder concentration</span>');
            }

            // Mint Authority Check
            if (analysis.mintAuthority === 'Active') {
                messages.push('<span class="icon-text warning"><span class="material-icons-round">lock_open</span>Mint authority not renounced</span>');
            }

            // Generate metrics info - using existing calculations
            const metricsNotice = `
                <div class="metrics-stack">
                    <div class="metric-row ${analysis.liquidityStatus.amount < 10000 ? 'critical' : analysis.liquidityStatus.amount < 50000 ? 'warning' : 'success'}">
                        ${analysis.liquidityStatus.amount < 10000 ? 'Critical' : analysis.liquidityStatus.amount < 50000 ? 'Moderate' : 'Good'} liquidity ($${formatNumber(analysis.liquidityStatus.amount)})
                    </div>
                    <div class="separator-line"></div>
                    <div class="metric-row ${volumeToLiquidityRatio < 10 ? 'warning' : volumeToLiquidityRatio > 200 ? 'warning' : 'neutral'}">
                        ${volumeToLiquidityRatio < 10 ? 'Very low' : volumeToLiquidityRatio > 200 ? 'Unusually high' : 'Normal'} volume (${volumeToLiquidityRatio.toFixed(1)}% of liquidity)
                    </div>
                    <div class="separator-line"></div>
                    <div class="metric-row ${txPerHour < 2 ? 'warning' : avgTradeSize < 10 ? 'warning' : 'neutral'}">
                        ${txPerHour < 2 ? 'Very low activity' : avgTradeSize < 10 ? 'Small trades' : 'Normal trading'} (${txPerHour.toFixed(1)} tx/hour, avg $${avgTradeSize.toFixed(0)})
                    </div>
                </div>
            `;

            // Clear previous notices and add the new metrics
            notices.length = 0;
            notices.push(metricsNotice);

            // Generate final message with color coding
            let finalMessage = '';

            // Add warnings first if any
            if (messages.length > 0) {
                if (analysis.safetyScore < 50) {
                    finalMessage = `<span class="danger-text"><span class="material-icons-round">dangerous</span>HIGH RISK:</span> ${messages.join(' ')}`;
                } else if (analysis.safetyScore < 70) {
                    finalMessage = `<span class="warning-text"><span class="material-icons-round">warning</span>CAUTION:</span> ${messages.join(' ')}`;
                } else {
                    finalMessage = `<span class="moderate-text"><span class="material-icons-round">info</span>NOTICE:</span> ${messages.join(' ')}`;
                }
            } else if (analysis.safetyScore >= 80) {
                finalMessage = '<span class="icon-text success"><span class="material-icons-round">verified</span>Token shows healthy metrics</span>';
            } else if (analysis.safetyScore >= 70) {
                finalMessage = '<span class="icon-text success"><span class="material-icons-round">check_circle</span>Token appears relatively safe</span>';
            }

            // Add notices section if we have any
            if (notices.length > 0) {
                finalMessage += `<div class="notice-section">${notices.join('')}</div>`;
            }

            return finalMessage || '<span class="icon-text neutral"><span class="material-icons-round">help_outline</span>Insufficient data for complete analysis</span>';
        }

        modalBody.innerHTML = `
            <style>
                .metrics-stack {
                    background: rgba(10, 10, 15, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    overflow: hidden;
                    width: 100%;
                }
                .metric-row {
                    padding: 8px 12px;
                    font-weight: 500;
                }
                .metric-row.critical { color: #FF3B69; }
                .metric-row.warning { color: #FFAB00; }
                .metric-row.success { color: rgb(18, 233, 204); }
                .metric-row.neutral { color: var(--text-secondary); }
                .separator-line {
                    height: 1px;
                    background: rgba(255, 255, 255, 0.05);
                    margin: 0;
                }
                .notice-section {
                    margin-top: 12px;
                }
            </style>
            <div class="zinc-analysis-results">
                <div class="zinc-main-metrics">
                    <div class="zinc-score-card ${analysis.safetyScore >= 70 ? 'good' : analysis.safetyScore >= 50 ? 'warning' : 'danger'}">
                        <div class="zinc-score-circle">
                            <span class="zinc-score-value">${analysis.safetyScore}</span>
                            <span class="zinc-score-label">Safety Score</span>
                        </div>
                        <div class="zinc-score-details">
                            <div class="zinc-risk-level">
                                <span class="zinc-label">Risk Level:</span>
                                <span class="zinc-value ${analysis.safetyScore >= 70 ? 'success' : analysis.safetyScore >= 50 ? 'warning' : 'danger'}">
                                    <span class="material-icons-round">${analysis.safetyScore >= 70 ? 'verified' : analysis.safetyScore >= 50 ? 'warning' : 'dangerous'}</span>
                                    ${analysis.safetyScore >= 70 ? 'Low Risk' : analysis.safetyScore >= 50 ? 'Medium Risk' : 'High Risk'}
                                </span>
                            </div>
                            <p class="zinc-risk-description">
                                ${generateRiskAnalysis(analysis)}
                            </p>
                        </div>
                    </div>

                    <style>
                        .icon-text {
                            display: inline-flex;
                            align-items: center;
                            gap: 4px;
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-weight: 500;
                        }
                        .icon-text .material-icons-round {
                            font-size: 16px;
                        }
                        .icon-text.critical {
                            color: #FF3B69;
                            background: rgba(255, 59, 105, 0.1);
                        }
                        .icon-text.warning {
                            color: #FFAB00;
                            background: rgba(255, 171, 0, 0.1);
                        }
                        .icon-text.success {
                            color: rgb(18, 233, 204);
                            background: rgba(18, 233, 204, 0.1);
                        }
                        .icon-text.neutral {
                            color: var(--text-secondary);
                            background: rgba(255, 255, 255, 0.05);
                        }
                        .danger-text, .warning-text, .moderate-text {
                            display: inline-flex;
                            align-items: center;
                            gap: 4px;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-weight: 600;
                        }
                        .danger-text {
                            color: #FF3B69;
                            background: rgba(255, 59, 105, 0.1);
                        }
                        .warning-text {
                            color: #FFAB00;
                            background: rgba(255, 171, 0, 0.1);
                        }
                        .moderate-text {
                            color: #2962ff;
                            background: rgba(41, 98, 255, 0.1);
                        }
                        .separator {
                            color: var(--text-secondary);
                            margin: 0 4px;
                            opacity: 0.5;
                        }
                        .zinc-risk-description {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 8px;
                            line-height: 1.6;
                            align-items: center;
                        }
                    </style>

                    <div class="zinc-metrics-grid">
                        <div class="zinc-metric-card">
                            <div class="zinc-metric-header">
                                <span class="material-icons-round">account_balance</span>
                                <h3>Liquidity</h3>
                            </div>
                            <div class="zinc-metric-value">$${formatNumber(analysis.liquidityStatus.amount)}</div>
                            <div class="zinc-metric-label ${analysis.liquidityStatus.amount > 100000 ? 'success' : 'warning'}">
                                ${analysis.liquidityStatus.amount > 100000 ? 'Healthy' : 'Limited'}
                            </div>
                        </div>
                        
                        <div class="zinc-metric-card">
                            <div class="zinc-metric-header">
                                <span class="material-icons-round">trending_up</span>
                                <h3>24h Volume</h3>
                            </div>
                            <div class="zinc-metric-value">$${formatNumber(analysis.liquidityStatus.volume24h)}</div>
                            <div class="zinc-metric-label ${analysis.liquidityStatus.volume24h > 50000 ? 'success' : 'warning'}">
                                ${analysis.liquidityStatus.volume24h > 50000 ? 'Active' : 'Low'}
                            </div>
                        </div>

                        <div class="zinc-metric-card">
                            <div class="zinc-metric-header">
                                <span class="material-icons-round">swap_horiz</span>
                                <h3>24h Transactions</h3>
                            </div>
                            <div class="zinc-metric-value">${analysis.liquidityStatus.txCount24h}</div>
                            <div class="zinc-metric-label ${analysis.liquidityStatus.txCount24h > 500 ? 'success' : 'warning'}">
                                ${analysis.liquidityStatus.txCount24h > 500 ? 'High Activity' : 'Low Activity'}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="zinc-details-section">
                    <div class="zinc-details-card">
                        <div class="zinc-details-header">
                            <span class="material-icons-round">verified</span>
                            <h3>Token Control & Supply</h3>
                        </div>
                        <div class="zinc-details-content">
                            <div class="zinc-detail-item">
                                <span class="zinc-label">Mint Authority:</span>
                                <span class="zinc-value ${analysis.mintAuthority === 'Revoked' ? 'success' : 'danger'}">
                                    ${analysis.mintAuthority}
                                    <span class="material-icons-round">${analysis.mintAuthority === 'Revoked' ? 'lock' : 'lock_open'}</span>
                                </span>
                            </div>
                            <div class="zinc-detail-item">
                                <span class="zinc-label">Freeze Authority:</span>
                                <span class="zinc-value ${analysis.freezeAuthority === 'Revoked' ? 'success' : 'danger'}">
                                    ${analysis.freezeAuthority}
                                    <span class="material-icons-round">${analysis.freezeAuthority === 'Revoked' ? 'lock' : 'lock_open'}</span>
                                </span>
                            </div>
                            <div class="zinc-detail-item">
                                <span class="zinc-label">Total Supply:</span>
                                <span class="zinc-value">${analysis.supply}</span>
                            </div>
                        </div>
                    </div>

                    <div class="zinc-details-card">
                        <div class="zinc-details-header">
                            <span class="material-icons-round">group</span>
                            <h3>Top 10 Holders</h3>
                        </div>
                        <div class="zinc-details-content">
                            ${analysis.holders.map((holder, index) => `
                                <div class="zinc-holder-item">
                                    <div class="zinc-holder-rank">#${index + 1}</div>
                                    <div class="zinc-holder-address">
                                        <span class="zinc-value">${holder.address.slice(0, 6)}...${holder.address.slice(-4)}</span>
                                        <button class="zinc-copy-btn" data-copy="${holder.address}">
                                            <span class="material-icons-round">content_copy</span>
                                        </button>
                                    </div>
                                    <div class="zinc-holder-amount ${parseFloat(holder.percentage) > 20 ? 'danger' : parseFloat(holder.percentage) > 10 ? 'warning' : 'success'}">${holder.percentage}%</div>
                                </div>
                            `).join('')}
                            <div class="zinc-holders-summary ${totalTopHoldersPercentage < 50 ? 'success' : totalTopHoldersPercentage < 70 ? 'warning' : 'danger'}">
                                <div class="zinc-holders-summary-content">
                                    <span class="zinc-holders-summary-label">Total Held by Top 10:</span>
                                    <span class="zinc-holders-summary-value">${analysis.topHoldersPercentage}%</span>
                                </div>
                                <div class="zinc-holders-summary-bar">
                                    <div class="zinc-holders-summary-progress" style="width: ${Math.min(100, totalTopHoldersPercentage)}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add copy button functionality
        const copyButtons = modal.querySelectorAll('.zinc-copy-btn');
        copyButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const textToCopy = button.getAttribute('data-copy');
                await copyToClipboard(textToCopy, button);
            });
        });

        // After setting the safety score, add mouse move effect
        const scoreCard = modalBody.querySelector('.zinc-score-card');
        if (scoreCard) {
            scoreCard.addEventListener('mousemove', (e) => {
                const rect = scoreCard.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                scoreCard.style.setProperty('--x', `${x}%`);
                scoreCard.style.setProperty('--y', `${y}%`);
            });

            const scoreCircle = scoreCard.querySelector('.zinc-score-circle');
            if (scoreCircle) {
                scoreCircle.style.setProperty('--progress', '0%');
                setTimeout(() => {
                    scoreCircle.style.setProperty('--progress', `${safetyScore}%`);
                }, 100);
            }
        }

    } catch (error) {
        console.error('Error analyzing token:', error);
        modal.querySelector('.zinc-modal-body').innerHTML = `
            <div class="zinc-analysis-error">
                <span class="material-icons-round">error_outline</span>
                <p>Error analyzing token: ${error.message}</p>
                <button class="zinc-retry-btn">
                    <span class="material-icons-round">refresh</span>
                    Retry Analysis
                </button>
            </div>
        `;

        const retryBtn = modal.querySelector('.zinc-retry-btn');
        if (retryBtn) {
            retryBtn.onclick = () => {
                window.isAnalysisModalLoading = false;
                showTokenAnalysis(contractAddress, symbol);
            };
        }
    } finally {
        window.isAnalysisModalLoading = false;
    }

    // Add close button handler
    modal.querySelector('.zinc-close-modal').onclick = () => {
        modal.style.display = 'none';
        window.isAnalysisModalLoading = false;
    };
}

// Update modal styles with better layout
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .zinc-token-analysis-modal {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(10, 10, 15, 0.8);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        z-index: 99999;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: zincFadeIn 0.2s ease;
    }

    @keyframes zincFadeIn {
        from { opacity: 0; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
    }

    .zinc-modal-content {
        background: linear-gradient(45deg, rgba(18, 18, 26, 0.95), rgba(41, 98, 255, 0.048));
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        width: 100%;
        max-width: 800px;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        position: relative;
        transform: translateZ(0);
        will-change: transform;
        transition: all 0.3s ease;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2),
                    0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    .zinc-modal-header {
        background: rgba(10, 10, 15, 0.7);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px 16px 0 0;
        position: sticky;
        top: 0;
        z-index: 2;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transform: translateZ(0);
        will-change: transform;
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        isolation: isolate;
    }

    .zinc-header-content {
        flex: 1;
    }

    .zinc-header-content h2 {
        margin: 0;
        font-size: 24px;
        color: var(--text-primary);
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }

    .zinc-header-details {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 8px;
    }

    .zinc-contract-info {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(10, 10, 15, 0.3);
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .zinc-label {
        color: var(--text-secondary);
        font-size: 13px;
    }

    .zinc-value {
        color: var(--text-primary);
        font-family: 'Roboto Mono', monospace;
        font-size: 13px;
    }

    .zinc-copy-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        padding: 4px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .zinc-copy-btn:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
    }

    .zinc-close-modal {
        width: 32px;
        height: 32px;
        padding: 6px;
        border-radius: 8px;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .zinc-close-modal:hover {
        background: rgba(255, 61, 0, 0.1);
        color: var(--danger-color);
    }

    .zinc-modal-body {
        padding: 24px;
        background: #0a0a0f2d;
    }

    .zinc-analysis-results {
        display: flex;
        flex-direction: column;
        gap: 32px;
    }

    .zinc-main-metrics {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .zinc-score-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 48px;
        background: linear-gradient(135deg, rgba(10, 10, 15, 0.5), rgba(20, 20, 30, 0.3));
        padding: 32px 48px;
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        position: relative;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .zinc-score-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), 
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0) 60%);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .zinc-score-card:hover::before {
        opacity: 1;
    }

    .zinc-score-circle {
        width: 160px;
        height: 160px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(10, 10, 15, 0.7);
        position: relative;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        flex: 0 0 160px;
        transform: translateZ(0);
        margin-left: auto;
        margin-right: 24px;
    }

    .zinc-score-circle::before {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 50%;
        background: conic-gradient(
            from 0deg,
            var(--progress-color) var(--progress),
            transparent var(--progress)
        );
        mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px));
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px));
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        transform: rotate(-90deg);
    }

    .zinc-score-circle::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        background: var(--progress-glow);
        filter: blur(20px);
        opacity: 0.5;
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .good .zinc-score-circle { 
        --progress-color: linear-gradient(135deg, #12E9CC, #00FFD1);
        --progress-glow: radial-gradient(circle at 50% 50%, rgba(18, 233, 204, 0.4), transparent 70%);
        box-shadow: 0 8px 32px rgba(18, 233, 204, 0.15);
    }

    .warning .zinc-score-circle { 
        --progress-color: linear-gradient(135deg, #FFB800, #FFD000);
        --progress-glow: radial-gradient(circle at 50% 50%, rgba(255, 184, 0, 0.4), transparent 70%);
        box-shadow: 0 8px 32px rgba(255, 184, 0, 0.15);
    }

    .danger .zinc-score-circle { 
        --progress-color: linear-gradient(135deg, #FF3B69, #FF5B4D);
        --progress-glow: radial-gradient(circle at 50% 50%, rgba(255, 59, 105, 0.4), transparent 70%);
        box-shadow: 0 8px 32px rgba(255, 59, 105, 0.15);
    }

    .zinc-score-value {
        font-size: 48px;
        font-weight: 800;
        background: var(--progress-color);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        line-height: 1;
        margin-bottom: 4px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        letter-spacing: -1px;
        transform: translateZ(0);
        animation: scoreAppear 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .zinc-score-label {
        font-size: 13px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 1.5px;
        font-weight: 600;
        opacity: 0.8;
        transform: translateZ(0);
    }

    @keyframes scoreAppear {
        0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
        }
        100% {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    .zinc-score-details {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 1px;
        max-width: 100%;
    }

    .zinc-risk-level {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
    }

    .zinc-risk-level .zinc-value {
        font-size: 15px;
        font-weight: 600;
    }

    .zinc-risk-level .success { color: rgb(18, 233, 204); }
    .zinc-risk-level .warning { color: #FFAB00; }
    .zinc-risk-level .danger { color: #FF3B69; }

    .zinc-risk-description {
        font-size: 15px;
        line-height: 1.6;
        color: var(--text-secondary);
        margin: 0;
        padding: 0;
    }

    .zinc-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
    }

    .zinc-metric-card {
        background: rgba(10, 10, 15, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .zinc-metric-header {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .zinc-metric-header h3 {
        margin: 0;
        font-size: 14px;
        color: var(--text-secondary);
        font-weight: 500;
    }

    .zinc-metric-header .material-icons-round {
        font-size: 18px;
        color: var(--text-secondary);
    }

    .zinc-metric-value {
        font-size: 24px;
        font-weight: 600;
        color: var(--text-primary);
        font-family: 'Roboto Mono', monospace;
    }

    .zinc-metric-label {
        font-size: 13px;
        padding: 4px 8px;
        border-radius: 4px;
        width: fit-content;
    }

    .zinc-metric-label.success {
        background: rgba(18, 233, 204, 0.1);
        color: rgb(18, 233, 204);
    }

    .zinc-metric-label.warning {
        background: rgba(255, 171, 0, 0.1);
        color: #FFAB00;
    }

    .zinc-details-section {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .zinc-details-card {
        background: rgba(10, 10, 15, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        overflow: hidden;
    }

    .zinc-details-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 16px;
        background: rgba(10, 10, 15, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .zinc-details-header h3 {
        margin: 0;
        font-size: 15px;
        color: var(--text-primary);
        font-weight: 600;
    }

    .zinc-details-header .material-icons-round {
        font-size: 18px;
        color: var(--text-secondary);
    }

    .zinc-details-content {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .zinc-detail-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
    }

    .zinc-detail-item .zinc-value {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .zinc-detail-item .zinc-value .material-icons-round {
        font-size: 16px;
    }

    .zinc-detail-item .success {
        color: rgb(18, 233, 204);
    }

    .zinc-detail-item .danger {
        color: #FF3B69;
    }

    .zinc-analysis-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 48px 24px;
        text-align: center;
        background: rgba(255, 59, 105, 0.1);
        border: 1px solid rgba(255, 59, 105, 0.2);
        border-radius: 12px;
    }

    .zinc-analysis-error .material-icons-round {
        font-size: 48px;
        color: #FF3B69;
        opacity: 0.8;
    }

    .zinc-retry-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .zinc-retry-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
        .zinc-token-analysis-modal {
            padding: 16px;
        }

        .zinc-modal-content {
            max-height: calc(100vh - 32px);
        }

        .zinc-header-content h2 {
            font-size: 20px;
            margin-bottom: 8px;
        }

        .zinc-header-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
        }

        .zinc-score-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
            padding: 16px;
        }

        .zinc-score-circle {
            width: 120px;
            height: 120px;
            flex: 0 0 120px;
            margin: 0;
        }

        .zinc-score-value {
            font-size: 42px;
        }

        .zinc-score-label {
            font-size: 11px;
            letter-spacing: 1px;
        }

        .zinc-score-details {
            width: 100%;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
    }

    @media (max-width: 480px) {
        .zinc-score-label {
            font-size: 10px;
            letter-spacing: 0.8px;
        }
    }

    .zinc-holder-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(10, 10, 15, 0.3);
        transition: all 0.2s ease;
    }

    .zinc-holder-item:hover {
        background: rgba(41, 98, 255, 0.1);
        transform: translateX(4px);
    }

    .zinc-holder-rank {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        min-width: 32px;
    }

    .zinc-holder-address {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .zinc-holder-amount {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        font-family: 'Roboto Mono', monospace;
    }

    .zinc-holder-item .zinc-copy-btn {
        opacity: 0;
        transition: all 0.2s ease;
    }

    .zinc-holder-item:hover .zinc-copy-btn {
        opacity: 1;
    }

    @media (max-width: 768px) {
        .zinc-holder-item .zinc-copy-btn {
            opacity: 1;
        }
    }

    .zinc-holders-summary {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .zinc-holders-summary-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .zinc-holders-summary-label {
        font-size: 13px;
        color: var(--text-secondary);
        font-weight: 500;
    }

    .zinc-holders-summary-value {
        font-size: 14px;
        font-weight: 600;
        font-family: 'Roboto Mono', monospace;
    }

    .zinc-holders-summary.success .zinc-holders-summary-value {
        color: rgb(18, 233, 204);
    }

    .zinc-holders-summary.warning .zinc-holders-summary-value {
        color: #FFAB00;
    }

    .zinc-holders-summary.danger .zinc-holders-summary-value {
        color: #FF3B69;
    }

    .zinc-holders-summary-bar {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
    }

    .zinc-holders-summary-progress {
        height: 100%;
        border-radius: 2px;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .zinc-holders-summary.success .zinc-holders-summary-progress {
        background: linear-gradient(90deg, rgba(18, 233, 204, 0.3), rgb(18, 233, 204));
    }

    .zinc-holders-summary.warning .zinc-holders-summary-progress {
        background: linear-gradient(90deg, rgba(255, 171, 0, 0.3), #FFAB00);
    }

    .zinc-holders-summary.danger .zinc-holders-summary-progress {
        background: linear-gradient(90deg, rgba(255, 59, 105, 0.3), #FF3B69);
    }

    @media (max-width: 768px) {
        .zinc-holder-item .zinc-copy-btn {
            opacity: 1;
        }
    }

    .token-info-wrapper {
        background: linear-gradient(180deg, 
            rgba(41, 98, 255, 0.05) 0%,
            rgba(10, 10, 15, 0) 100%);
        border: 1px solid rgba(41, 98, 255, 0.1);
        border-radius: 16px;
        padding: 16px 20px;
        margin: 0;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        width: calc(100% + 16px);
        box-sizing: border-box;
        position: relative;
        z-index: 10;
        margin-left: -8px;
        margin-right: -8px;
    }

    .token-info-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
    }

    .token-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }

    .name-and-metrics {
        display: flex;
        gap: 16px;
        flex: 1;
        min-width: 0;
        width: 100%;
    }

    .token-name {
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 120px;
        max-width: 200px;
        letter-spacing: -0.5px;
    }

    .token-metrics {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
        margin-left: auto;
    }

    .metric-badge {
        display: flex;
        flex-direction: column;
        padding: 4px 12px;
        border-radius: 8px;
        background: rgba(10, 10, 15, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.05);
        min-width: 90px;
        transition: all 0.2s ease;
    }

    .metric-badge:hover {
        transform: translateY(-1px);
        background: rgba(255, 255, 255, 0.05);
    }

    .metric-badge.volume,
    .metric-badge.mcap {
        background: rgba(41, 98, 255, 0.05);
        border-color: rgba(41, 98, 255, 0.1);
    }

    .metric-badge.change.positive {
        background: rgba(18, 233, 204, 0.05);
        border-color: rgba(18, 233, 204, 0.1);
    }

    .metric-badge.change.negative {
        background: rgba(255, 59, 105, 0.05);
        border-color: rgba(255, 59, 105, 0.1);
    }

    .metric-label {
        font-size: 11px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.8;
    }

    .metric-value {
        font-size: 13px;
        font-weight: 600;
        font-family: 'Roboto Mono', monospace;
        color: var(--text-primary);
    }

    .change.positive .metric-value {
        color: rgb(18, 233, 204);
        text-shadow: 0 0 8px rgba(18, 233, 204, 0.4);
    }

    .change.negative .metric-value {
        color: rgb(255, 59, 105);
        text-shadow: 0 0 8px rgba(255, 59, 105, 0.4);
    }

    .token-addresses {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
    }

    .address-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: rgba(10, 10, 15, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        transition: all 0.2s ease;
    }

    .address-badge:hover {
        background: rgba(10, 10, 15, 0.4);
        border-color: rgba(255, 255, 255, 0.1);
    }

    .address-group {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
    }

    .badge-label {
        font-size: 11px;
        color: var(--text-secondary);
        font-weight: 500;
    }

    .badge-value {
        font-size: 12px;
        font-family: 'Roboto Mono', monospace;
        color: var(--text-primary);
    }

    .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 4px;
        border-radius: 4px;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
        transform: translateY(-1px);
    }

    .icon-btn .material-icons-round {
        font-size: 14px;
    }

    .analyze-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border-radius: 6px;
        background: rgba(41, 98, 255, 0.1);
        border: 1px solid rgba(41, 98, 255, 0.2);
        color: #2962ff;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .analyze-btn:hover {
        background: rgba(41, 98, 255, 0.15);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(41, 98, 255, 0.15);
    }

    .analyze-btn .material-icons-round {
        font-size: 16px;
    }

    @media (max-width: 768px) {
        .token-info-wrapper {
            margin: 0;
            border-radius: 10px;
            padding: 10px;
            width: 100%;
            max-width: 100vw;
        }

        .token-info-grid {
            width: 100%;
        }

        .name-and-metrics {
            flex-direction: row;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            width: 100%;
        }

        .token-metrics {
            flex-wrap: nowrap;
            gap: 4px;
            margin-left: 0;
        }

        .metric-badge {
            min-width: 70px;
            padding: 2px 6px;
        }

        .token-addresses {
            display: flex;
            flex-direction: row;
            width: 100%;
            gap: 4px;
            align-items: center;
        }

        .address-badge {
            padding: 3px 6px;
            flex-shrink: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .token-badge {
            flex: 0 1 auto;
            max-width: 33%;
        }

        .pair-badge {
            flex: 1;
            max-width: calc(67% - 32px);
        }

        .badge-value {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
        }

        .analyze-btn {
            flex: 0 0 28px;
            width: 28px;
            height: 28px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: auto;
        }

        .icon-btn {
            flex: 0 0 22px;
            width: 22px;
            height: 22px;
            padding: 4px;
        }

        .icon-btn .material-icons-round,
        .analyze-btn .material-icons-round {
            font-size: 14px;
        }
    }

    .token-info-group {
        display: flex;
        margin: 0;
    }

    .token-addresses {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: nowrap;
    }

    .address-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: rgba(10, 10, 15, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        transition: all 0.2s ease;
    }

    .token-badge {
        flex: 0 1 auto;
        min-width: 0;
    }

    .pair-badge {
        flex: 1;
        min-width: 0;
    }

    @media (max-width: 768px) {
        .token-info-group {
            max-width: 100%;
        }

        .token-addresses {
            gap: 4px;
            justify-content: flex-start;
        }

        .address-badge {
            padding: 3px 6px;
        }

        .token-badge {
            width: auto;
            max-width: 38%;
        }

        .pair-badge {
            width: auto;
            max-width: 45%;
            flex: 0 1 auto;
        }

        .badge-value {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
        }

        .analyze-btn {
            flex: 0 0 28px;
            width: 28px;
            height: 28px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 4px;
        }

        .icon-btn {
            flex: 0 0 22px;
            width: 22px;
            height: 22px;
            padding: 4px;
        }

        .icon-btn .material-icons-round,
        .analyze-btn .material-icons-round {
            font-size: 14px;
        }
    }

    .zinc-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
    }

    @media (max-width: 768px) {
        .zinc-metrics-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }

        .zinc-metric-card {
            padding: 8px;
        }

        .zinc-metric-header {
            gap: 4px;
        }

        .zinc-metric-header h3 {
            font-size: 11px;
        }

        .zinc-metric-header .material-icons-round {
            font-size: 14px;
        }

        .zinc-metric-value {
            font-size: 16px;
            margin: 2px 0;
        }

        .zinc-metric-label {
            font-size: 10px;
            padding: 2px 6px;
        }
    }

    @media (max-width: 480px) {
        .zinc-metrics-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
        }

        .zinc-metric-card {
            padding: 6px;
        }

        .zinc-metric-header {
            gap: 3px;
        }

        .zinc-metric-header h3 {
            font-size: 10px;
        }

        .zinc-metric-header .material-icons-round {
            font-size: 12px;
        }

        .zinc-metric-value {
            font-size: 14px;
            margin: 1px 0;
        }

        .zinc-metric-label {
            font-size: 9px;
            padding: 1px 4px;
        }
    }

    @media (max-width: 768px) {
        .zinc-score-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 16px;
            padding: 16px;
        }

        .zinc-score-circle {
            width: 120px;
            height: 120px;
            flex: 0 0 120px;
            margin: 0;
        }

        .zinc-score-value {
            font-size: 42px;
        }

        .zinc-score-label {
            font-size: 11px;
            letter-spacing: 1px;
        }

        .zinc-score-details {
            width: 100%;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
    }

    @media (max-width: 480px) {
        .zinc-score-label {
            font-size: 10px;
            letter-spacing: 0.8px;
        }
    }

    .notice-section {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
    }
`;

document.head.appendChild(modalStyles);
