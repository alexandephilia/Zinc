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
                await copyToClipboard(textToCopy);
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
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Get all copy buttons
        const copyButtons = document.querySelectorAll('.copy-btn');
        
        // Find the button that has this text as data-copy
        const clickedButton = Array.from(copyButtons).find(btn => btn.getAttribute('data-copy') === text);
        
        if (clickedButton) {
            const icon = clickedButton.querySelector('.material-icons-round');
            const originalText = icon.textContent;
            
            // Visual feedback
            icon.textContent = 'check';
            clickedButton.style.color = 'var(--success-color)';
            
            // Reset after 2 seconds
            setTimeout(() => {
                icon.textContent = originalText;
                clickedButton.style.color = '';
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

// Calculator functionality
window.showCalculatorForPair = function(pairAddress, symbol) {
    const calculator = document.querySelector('.pair-calculator');
    const tokenSymbol = document.querySelector('.calc-symbol');
    let currentPrice = 0;
    let currentPair = null;

    // Show calculator
    calculator.style.display = 'block';

    // Update token symbol
    if (tokenSymbol) {
        tokenSymbol.textContent = symbol;
    }

    // Function to update price
    async function updatePrice() {
        try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`);
            const data = await response.json();
            if (data.pair) {
                currentPrice = parseFloat(data.pair.priceUsd);
                currentPair = data.pair;
            }
        } catch (error) {
            console.error('Error fetching price:', error);
        }
    }

    // Initial price update
    updatePrice();

    // Start price updates
    if (window.calculatorInterval) {
        clearInterval(window.calculatorInterval);
    }
    window.calculatorInterval = setInterval(updatePrice, 10000);

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
}

// Function to hide calculator
window.hideCalculator = function() {
    const calculator = document.querySelector('.pair-calculator');
    calculator.style.display = 'none';
    if (window.calculatorInterval) {
        clearInterval(window.calculatorInterval);
    }
}
