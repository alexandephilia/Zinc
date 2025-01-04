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

// Helper function to format numbers
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

// Function to show calculator for pair
window.showCalculatorForPair = function(pairAddress, symbol) {
    const calculator = document.querySelector('.pair-calculator');
    const tokenSymbol = document.querySelector('.calc-symbol');
    let currentPrice = 0;
    let currentPair = null;

    // Create calculator toggle button for mobile if it doesn't exist
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

    // Function to update price and recalculate values
    async function updatePrice() {
        try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            if (data.pair) {
                const newPrice = parseFloat(data.pair.priceUsd);
                // Only update if price has changed or initial load
                if (newPrice !== currentPrice || currentPrice === 0) {
                    currentPrice = newPrice;
                    currentPair = data.pair;
                    
                    // Update calculations if inputs have values
                    const tokenInput = document.getElementById('tokenAmount');
                    const usdInput = document.getElementById('usdAmount');
                    
                    // Force update both inputs on price change
                    if (tokenInput.value) {
                        const tokenAmount = parseFloat(tokenInput.value);
                        const usdValue = (tokenAmount * currentPrice).toFixed(2);
                        usdInput.value = usdValue;
                    } else if (usdInput.value) {
                        const usdAmount = parseFloat(usdInput.value);
                        const tokenValue = (usdAmount / currentPrice).toFixed(6);
                        tokenInput.value = tokenValue;
                    }
                }
            } else {
                console.warn('No pair data received from DexScreener');
            }
        } catch (error) {
            console.error('Error fetching price:', error);
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
            const tokenAmount = parseFloat(tokenInput.value);
            const usdValue = (tokenAmount * currentPrice).toFixed(2);
            usdInput.value = usdValue;
        });
        tokenInput.hasEventListener = true;
    }

    if (!usdInput.hasEventListener) {
        usdInput.addEventListener('input', () => {
            if (!usdInput.value) {
                tokenInput.value = '';
                return;
            }
            const usdAmount = parseFloat(usdInput.value);
            const tokenValue = (usdAmount / currentPrice).toFixed(6);
            tokenInput.value = tokenValue;
        });
        usdInput.hasEventListener = true;
    }

    // Clear any existing interval
    if (window.calculatorInterval) {
        clearInterval(window.calculatorInterval);
    }
    
    // Start price updates with a shorter interval (500ms) for more responsive updates
    window.calculatorInterval = setInterval(updatePrice, 500);
}

// Function to hide calculator
window.hideCalculator = function() {
    const calculator = document.querySelector('.pair-calculator');
    const calculatorToggle = document.querySelector('.calculator-toggle');
    const backdrop = document.querySelector('.calculator-backdrop');
    
    calculator.style.display = 'none';
    if (calculatorToggle) {
        calculatorToggle.remove();
    }
    if (backdrop) {
        backdrop.remove();
    }
    
    if (window.calculatorInterval) {
        clearInterval(window.calculatorInterval);
    }
}
