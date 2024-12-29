// Sidebar Resizing with restrictions
const sidebar = document.querySelector('.sidebar');
const resizer = document.querySelector('.sidebar-resizer');
let isResizing = false;
let lastX = 0;

// Initialize loading state
let appLoaded = false;
let fontsLoaded = false;
let contentLoaded = false;

resizer.addEventListener('mousedown', initResize);
document.addEventListener('mousemove', resize);
document.addEventListener('mouseup', stopResize);

function initResize(e) {
    isResizing = true;
    lastX = e.clientX;
    
    // Add resizing class for visual feedback
    document.body.classList.add('resizing');
    sidebar.classList.add('resizing');
    resizer.classList.add('resizing');
}

function resize(e) {
    if (!isResizing) return;

    const delta = e.clientX - lastX;
    const newWidth = sidebar.offsetWidth + delta;
    
    // Enforce min/max constraints
    const minWidth = 240;
    const maxWidth = Math.min(300, window.innerWidth * 0.3);
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
        sidebar.style.width = `${newWidth}px`;
        lastX = e.clientX;
        updateQuickTradeLayout();
        
        // Prevent text selection during resize
        e.preventDefault();
    }
}

function stopResize() {
    if (!isResizing) return;
    
    isResizing = false;
    lastX = 0;
    
    // Remove resizing classes
    document.body.classList.remove('resizing');
    sidebar.classList.remove('resizing');
    resizer.classList.remove('resizing');
}

// Prevent text selection while resizing
document.addEventListener('selectstart', (e) => {
    if (isResizing) e.preventDefault();
});

// Timeframe button functionality
document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update button states
        document.querySelectorAll('.timeframe-btn').forEach(b => 
            b.classList.remove('active')
        );
        btn.classList.add('active');
        
        // Get interval from button text and map to correct format
        const buttonText = btn.textContent.trim().toLowerCase();
        let interval;
        switch (buttonText) {
            case '1m': interval = '1'; break;
            case '5m': interval = '5'; break;
            case '15m': interval = '15'; break;
            case '1h': interval = '60'; break;
            case '4h': interval = '240'; break;
            case '1d': interval = 'D'; break;
            case '1w': interval = 'W'; break;
            default: interval = '15'; // fallback to 15m
        }
        
        // Reload widget with new interval
        const container = document.getElementById('tradingview_solana');
        const symbol = container.getAttribute('data-symbol') || 'BINANCE:SOLUSDT';
        container.style.height = 'calc(100% - 10px)';
        container.innerHTML = '';
        initTradingViewWidget(container, symbol, interval);
    });
});

// Market Filter functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Watchlist item selection
document.querySelectorAll('.watchlist-item').forEach(item => {
    item.addEventListener('click', async () => {
        // Update active state
        document.querySelectorAll('.watchlist-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Get the trading pair from the clicked item
        const symbol = item.getAttribute('data-symbol');
        
        // Get pair data from DexScreener
        if (window.DEXSCREENER_TOKENS[symbol] || symbol === 'NOS') {
            try {
                const pair = await window.fetchPairData(symbol);
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
        initTradingViewWidget(container, `BINANCE:${symbol}USDT`, '15');
        
        // Update webpage title
        document.title = `Zinc | ${symbol}/SOL`;
    });
});

// Function to show trending view
function showTrendingView() {
    // Hide calculator for TradingView
    window.hideCalculator();
    
    // Show market grid container
    const marketGridContainer = document.querySelector('.market-grid-container');
    const chartSection = document.querySelector('.chart-section');
    const sectionHeader = document.querySelector('.section-header');
    
    // Show chart controls back
    const chartControls = document.querySelector('.chart-controls');
    if (chartControls) {
        chartControls.style.display = 'flex';
    }
    
    // Restore original header
    sectionHeader.innerHTML = `
        <div class="section-title">
            <span class="material-icons-round" style="animation: glowPulse 2s ease-in-out infinite;">trending_up</span>
            Trending
        </div>
    `;

    // Restore webpage title
    document.title = 'Zinc | SOL/USDT';

    // Restore default chart title
    const chartTitle = document.querySelector('.chart-title');
    if (chartTitle) {
        chartTitle.innerHTML = `
            <img src="https://img.icons8.com/?size=100&id=NgbFFSOCkrnB&format=png&color=FFFFFF" alt="Solana Logo" style="width: 24px; height: 24px;">
            <div>
                <div style="font-weight: 600;">SOL/USDT</div>
                <div style="font-size: 12px; color: var(--text-secondary);">Solana / Tether</div>
            </div>
        `;
    }
    
    // Show market grid container and adjust chart height
    marketGridContainer.style.display = 'block';
    chartSection.style.height = `calc(100vh - var(--navbar-height) - ${marketGridContainer.offsetHeight}px - var(--spacing) * 2)`;
    
    // Reset to TradingView widget
    const container = document.getElementById('tradingview_solana');
    container.innerHTML = '';
    container.style = ''; // Reset any custom styles
    initTradingViewWidget(container, 'BINANCE:SOLUSDC', '15');
}

// Quick Trade Amount Input Formatting
const amountInput = document.querySelector('.trade-input[type="number"]');
if (amountInput) {
    amountInput.addEventListener('input', (e) => {
        let value = e.target.value;
        if (value) {
            value = parseFloat(value).toLocaleString('en-US', {
                maximumFractionDigits: 8
            });
        }
    });
}



// Dynamic Watchlist Item Coloring
document.querySelectorAll('.watchlist-item').forEach(item => {
    const percentage = item.querySelector('.title-percentage');
    if (percentage) {
        if (percentage.classList.contains('positive')) {
            item.classList.add('positive');
        } else if (percentage.classList.contains('negative')) {
            item.classList.add('negative');
        }
    }
});

// Add these functions to handle body scroll locking
function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
}

function unlockBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
}

// Mobile Sidebar Toggle with scroll lock
const toggleSidebar = (e) => {
    e?.preventDefault(); // Prevent any default behavior
    const sidebar = document.querySelector('.sidebar');
    const isActive = sidebar.classList.contains('active');
    
    // Toggle with a slight delay to ensure smooth animation
    requestAnimationFrame(() => {
        sidebar.classList.toggle('active');
        
        // Lock/unlock body scroll when sidebar is opened/closed
        if (!isActive) {
            lockBodyScroll();
        } else {
            unlockBodyScroll();
        }
    });
};

// Add mobile menu button to navbar if screen is small
const checkMobileView = () => {
    const navbar = document.querySelector('.navbar');
    const existingBtn = navbar.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    
    // FORCE add init-complete class to enable transitions
    if (!sidebar.classList.contains('init-complete')) {
        sidebar.classList.add('init-complete');
    }
    
    if (window.innerWidth <= 768) {
        // Ensure sidebar is hidden by default on mobile
        sidebar.classList.remove('active');
        
        if (!existingBtn) {
            const menuBtn = document.createElement('button');
            menuBtn.className = 'icon-btn mobile-menu-btn';
            menuBtn.innerHTML = '<span class="material-icons-round">menu</span>';
            menuBtn.addEventListener('click', toggleSidebar, { passive: false });
            navbar.insertBefore(menuBtn, navbar.firstChild);
        }
    } else {
        if (existingBtn) {
            existingBtn.remove();
            unlockBodyScroll();
        }
        // Show sidebar by default on desktop
        sidebar.classList.remove('active');
        sidebar.style.visibility = 'visible';
        sidebar.style.opacity = '1';
        sidebar.style.transform = 'translateX(0)';
    }
};

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    
    if (window.innerWidth <= 768 && 
        sidebar.classList.contains('active') && 
        !sidebar.contains(e.target) && 
        e.target !== mobileMenuBtn && 
        !e.target.closest('.mobile-menu-btn')) {
        
        toggleSidebar();
    }
}, { passive: false });

// CRITICAL: Initialize mobile view IMMEDIATELY
document.addEventListener('DOMContentLoaded', () => {
    // Force immediate check before any rendering
    checkMobileView();
    
    // Mark content as loaded
    contentLoaded = true;
    handleAppLoaded();
    
    // Delay non-critical initializations
    requestAnimationFrame(() => {
        initMarketCardsAnimation();
    });
}, { passive: true });

// Handle window load completion
window.addEventListener('load', () => {
    appLoaded = true;
    handleAppLoaded();
    checkMobileView();
}, { passive: true });

// Smooth scroll behavior for sidebar
const sidebarContent = document.querySelector('.sidebar-content');
let isScrolling;

sidebarContent.addEventListener('scroll', () => {
    clearTimeout(isScrolling);
    sidebarContent.style.pointerEvents = 'none';
    
    isScrolling = setTimeout(() => {
        sidebarContent.style.pointerEvents = 'auto';
    }, 100);
});

// Adaptive input handling
const tradeInputs = document.querySelectorAll('.trade-input');
tradeInputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.style.zIndex = '1';
    });
    
    input.addEventListener('blur', () => {
        input.parentElement.style.zIndex = '0';
    });
});

// Handle Quick Trade Layout
const quickTrade = document.querySelector('.quick-trade');

function updateQuickTradeLayout() {
    if (sidebar.offsetWidth < 300) {
        quickTrade.classList.add('compact');
    } else {
        quickTrade.classList.remove('compact');
    }
}

// Update layout on resize
const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        if (entry.target === sidebar) {
            updateQuickTradeLayout();
        }
    }
});

resizeObserver.observe(sidebar);

// Initial layout check
updateQuickTradeLayout();

// Custom Dropdown functionality
document.querySelectorAll('.custom-select').forEach(select => {
    const trigger = select.querySelector('.custom-select-trigger');
    const options = select.querySelector('.custom-select-options');
    const selectedValue = select.querySelector('.selected-value');

    // Handle click on trigger
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = select.classList.contains('active');
        
        // Close all other dropdowns
        document.querySelectorAll('.custom-select.active').forEach(s => {
            if (s !== select) s.classList.remove('active');
        });

        // Toggle current dropdown
        select.classList.toggle('active');

        // Check if we should show dropdown above or below
        if (!isActive) {
            const rect = select.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = options.offsetHeight;

            if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                select.classList.add('dropup');
            } else {
                select.classList.remove('dropup');
            }
        }
    });

    // Handle option selection
    select.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', () => {
            // Update selected value
            selectedValue.textContent = option.textContent;
            
            // Update selected state
            select.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            
            // Close dropdown
            select.classList.remove('active');
        });
    });
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select.active').forEach(select => {
        select.classList.remove('active');
    });
});

// Enhanced timeframe scroll with drag functionality
const timeframeGroup = document.querySelector('.timeframe-group');
if (timeframeGroup) {
    let isDown = false;
    let startX;
    let scrollLeft;

    const checkScroll = () => {
        const { scrollLeft, scrollWidth, clientWidth } = timeframeGroup;
        timeframeGroup.classList.toggle('at-start', scrollLeft <= 0);
        timeframeGroup.classList.toggle('at-end', 
            Math.ceil(scrollLeft + clientWidth) >= scrollWidth
        );
    };

    timeframeGroup.addEventListener('mousedown', (e) => {
        isDown = true;
        timeframeGroup.classList.add('active');
        startX = e.pageX - timeframeGroup.offsetLeft;
        scrollLeft = timeframeGroup.scrollLeft;
    });

    timeframeGroup.addEventListener('mouseleave', () => {
        isDown = false;
        timeframeGroup.classList.remove('active');
    });

    timeframeGroup.addEventListener('mouseup', () => {
        isDown = false;
        timeframeGroup.classList.remove('active');
    });

    timeframeGroup.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - timeframeGroup.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll speed multiplier
        timeframeGroup.scrollLeft = scrollLeft - walk;
        checkScroll();
    });

    // Touch events for mobile
    timeframeGroup.addEventListener('touchstart', (e) => {
        isDown = true;
        timeframeGroup.classList.add('active');
        startX = e.touches[0].pageX - timeframeGroup.offsetLeft;
        scrollLeft = timeframeGroup.scrollLeft;
    });

    timeframeGroup.addEventListener('touchend', () => {
        isDown = false;
        timeframeGroup.classList.remove('active');
    });

    timeframeGroup.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.touches[0].pageX - timeframeGroup.offsetLeft;
        const walk = (x - startX) * 1.5;
        timeframeGroup.scrollLeft = scrollLeft - walk;
        checkScroll();
    });

    // Regular scroll event
    timeframeGroup.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    
    // Initial check
    checkScroll();
}

// Enhanced Search Bar Functionality
const searchBar = document.querySelector('.search-bar');
const searchInput = searchBar.querySelector('input');
const clearBtn = searchBar.querySelector('.clear-btn');

// Focus handling
searchInput.addEventListener('focus', () => {
    searchBar.classList.add('focused');
});

searchInput.addEventListener('blur', () => {
    searchBar.classList.remove('focused');
});

// Add debounce function to prevent too many API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Function to format volume
function formatVolume(volume) {
    if (volume >= 1e9) return (volume / 1e9).toFixed(1) + 'B';
    if (volume >= 1e6) return (volume / 1e6).toFixed(1) + 'M';
    if (volume >= 1e3) return (volume / 1e3).toFixed(1) + 'K';
    return volume.toFixed(1);
}

// Function to search DexScreener pairs
async function searchDexScreenerPairs(query) {
    if (!query) return;
    
    try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/search/?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        // Filter for Solana pairs only
        const solanaPairs = data.pairs?.filter(pair => pair.chainId === 'solana') || [];
        return solanaPairs;
    } catch (error) {
        console.error('Error searching pairs:', error);
        return [];
    }
}

// Function to display search results
function displaySearchResults(pairs) {
    let resultsContainer = document.querySelector('.search-results');
    
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        document.querySelector('.search-bar').appendChild(resultsContainer);
    }
    
    resultsContainer.innerHTML = '';
    
    if (pairs.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No pairs found</div>';
        return;
    }
    
    pairs.slice(0, 10).forEach(pair => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        const price = parseFloat(pair.priceUsd);
        const formattedPrice = price < 0.01 ? 
            price.toFixed(8) : 
            price.toFixed(price < 1 ? 4 : 2);

        const priceChange24h = parseFloat(pair.priceChange.h24);
        const priceChangeClass = priceChange24h >= 0 ? 'positive' : 'negative';
        const priceChangeSign = priceChange24h >= 0 ? '+' : '';

        const shortContractAddress = pair.baseToken.address ? 
            pair.baseToken.address.slice(0, 6) + '...' + pair.baseToken.address.slice(-4) : '';
        const shortPairAddress = pair.pairAddress ? 
            pair.pairAddress.slice(0, 6) + '...' + pair.pairAddress.slice(-4) : '';
        
        resultItem.innerHTML = `
            <div class="result-pair">
                <div class="result-symbol">
                    ${pair.baseToken.symbol}/${pair.quoteToken.symbol}
                    <span class="chain-tag">SOL</span>
                </div>
                <div class="result-name-row">
                    <span class="result-name">${pair.baseToken.name || 'Unknown Token'}</span>
                    <span class="title-percentage ${priceChangeClass}">${priceChangeSign}${priceChange24h.toFixed(2)}%</span>
                </div>
                ${pair.baseToken.address ? `
                    <div class="result-addresses">
                        <div class="mini-contract-info">
                            <span class="mini-label">Contract:</span>
                            <span class="mini-address">${shortContractAddress}</span>
                        </div>
                        <div class="mini-contract-info">
                            <span class="mini-label">Pair:</span>
                            <span class="mini-address">${shortPairAddress}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="result-info">
                <div class="result-price">$${formattedPrice}</div>
                <div class="result-volume">Vol $${formatVolume(pair.volume.h24)}</div>
            </div>
        `;
        
        // Add click handler to show DexScreener chart
        resultItem.addEventListener('click', () => {
            showPairChart(pair);
            clearSearch();
        });
        
        resultsContainer.appendChild(resultItem);
    });
    
    resultsContainer.style.display = 'block';
}

// Function to clear search
function clearSearch() {
    searchInput.value = '';
    searchBar.classList.remove('has-value');
    const resultsContainer = document.querySelector('.search-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

// Input handling with debounce
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    searchBar.classList.toggle('has-value', query.length > 0);
    
    if (query.length >= 2) {
        debouncedSearch(query);
    } else {
        const resultsContainer = document.querySelector('.search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }
});

// Add debounced search
const debouncedSearch = debounce(async (query) => {
    const pairs = await searchDexScreenerPairs(query);
    displaySearchResults(pairs);
}, 300);

// Clear button
clearBtn.addEventListener('click', clearSearch);

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
        const resultsContainer = document.querySelector('.search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }
});

// Profile Dropdown Functionality
document.addEventListener('DOMContentLoaded', () => {
    const profileBtn = document.getElementById('profileBtn');
    const walletMenu = document.getElementById('walletMenu');

    // Toggle dropdown on profile button click
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        walletMenu.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!walletMenu.contains(e.target) && !profileBtn.contains(e.target)) {
            walletMenu.classList.remove('active');
        }
    });

    // Handle wallet connections
    document.querySelectorAll('.wallet-option').forEach(button => {
        button.addEventListener('click', async () => {
            const walletType = button.textContent.trim();
            try {
                switch (walletType) {
                    case 'MetaMask':
                        if (typeof window.ethereum !== 'undefined') {
                            await window.ethereum.request({ method: 'eth_requestAccounts' });
                            // Handle successful connection
                            console.log('Connected to MetaMask');
                        } else {
                            window.open('https://metamask.io/download/', '_blank');
                        }
                        break;
                    case 'Phantom':
                        if (typeof window.solana !== 'undefined') {
                            await window.solana.connect();
                            // Handle successful connection
                            console.log('Connected to Phantom');
                        } else {
                            window.open('https://phantom.app/', '_blank');
                        }
                        break;
                    case 'WalletConnect':
                        // Initialize WalletConnect
                        // Note: Requires WalletConnect SDK integration
                        console.log('WalletConnect integration pending');
                        break;
                }
            } catch (error) {
                console.error('Error connecting wallet:', error);
            }
            walletMenu.classList.remove('active');
        });
    });
});

// Quick Trade Connect functionality
document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('quickTradeConnect');
    const dexOptions = document.getElementById('dexOptions');

    if (connectBtn && dexOptions) {
        connectBtn.addEventListener('click', () => {
            connectBtn.style.display = 'none';
            dexOptions.classList.remove('hidden');
        });
    }
});

// Quick Trade unblur functionality
document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('quickTradeConnect');
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            // Remove blur classes
            document.querySelector('.trade-input-group.blurred')?.classList.remove('blurred');
            document.querySelector('.dex-buttons.blurred')?.classList.remove('blurred');
            document.querySelector('.blur-overlay')?.remove();
            
            // Hide connect button
            connectBtn.style.display = 'none';
        });
    }
});

// Market Grid Resizing
const marketGrid = document.querySelector('.market-grid');
const chartSection = document.querySelector('.chart-section');

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const navbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height'));
        const spacing = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--spacing'));
        chartSection.style.height = `calc(100vh - ${navbarHeight}px - ${marketGrid.offsetHeight}px - ${spacing * 2}px)`;
        
        window.dispatchEvent(new Event('resize'));
    }, 100);
});

// Function to fetch WIF data from DexScreener
async function updateWIFData() {
    try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana/EP2ib6dYdEeqD8MfE2ezHCxX3kP3K2eLKkirfPm5eyMx');
        const data = await response.json();
        const pair = data.pair;

        if (pair) {
            // Update watchlist item
            const wifItem = document.querySelector('.watchlist-item[data-symbol="WIF"]');
            if (wifItem) {
                // Update price with USD value
                const priceElement = wifItem.querySelector('.watchlist-price');
                if (priceElement) {
                    priceElement.textContent = `$${parseFloat(pair.priceUsd).toFixed(8)}`;
                }

                // Update 24h change
                const percentageElement = wifItem.querySelector('.title-percentage');
                if (percentageElement) {
                    const priceChange = parseFloat(pair.priceChange.h24);
                    percentageElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
                    percentageElement.className = `title-percentage ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    
                    // Update item class for glow effect
                    wifItem.className = `watchlist-item ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    if (wifItem.classList.contains('active')) {
                        wifItem.classList.add('active');
                    }
                    
                    // Update trend icon
                    const trendIcon = wifItem.querySelector('.material-icons-round');
                    if (trendIcon) {
                        trendIcon.textContent = priceChange >= 0 ? 'trending_up' : 'trending_down';
                        trendIcon.style.color = `var(--${priceChange >= 0 ? 'success' : 'danger'}-color)`;
                    }
                }

                // Update volume and 24h change in stats
                const statsElement = wifItem.querySelector('.watchlist-stats');
                if (statsElement) {
                    const volume = parseFloat(pair.volume.h24);
                    const mcap = parseFloat(pair.fdv);
                    statsElement.innerHTML = `
                        <span>Vol ${formatNumber(volume)}</span>
                        <span>MCap: $${formatNumber(mcap)}</span>
                    `;
                }
            }
            
            // Update market card
            updateMarketCard('WIF', pair);
        }
    } catch (error) {
        console.error('Error fetching WIF data:', error);
    }
}

// Helper function to format numbers with K, M, B suffixes
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

// Function to fetch POPCAT data from DexScreener
async function updatePOPCATData() {
    try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana/FRhB8L7Y9Qq41qZXYLtC2nw8An1RJfLLxRF2x9RwLLMo');
        const data = await response.json();
        const pair = data.pair;

        if (pair) {
            // Update watchlist item
            const popcatItem = document.querySelector('.watchlist-item[data-symbol="POPCAT"]');
            if (popcatItem) {
                // Update price with USD value
                const priceElement = popcatItem.querySelector('.watchlist-price');
                if (priceElement) {
                    priceElement.textContent = `$${parseFloat(pair.priceUsd).toFixed(8)}`;
                }

                // Update 24h change
                const percentageElement = popcatItem.querySelector('.title-percentage');
                if (percentageElement) {
                    const priceChange = parseFloat(pair.priceChange.h24);
                    percentageElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
                    percentageElement.className = `title-percentage ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    
                    // Update item class for glow effect
                    popcatItem.className = `watchlist-item ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    if (popcatItem.classList.contains('active')) {
                        popcatItem.classList.add('active');
                    }
                    
                    // Update trend icon
                    const trendIcon = popcatItem.querySelector('.material-icons-round');
                    if (trendIcon) {
                        trendIcon.textContent = priceChange >= 0 ? 'trending_up' : 'trending_down';
                        trendIcon.style.color = `var(--${priceChange >= 0 ? 'success' : 'danger'}-color)`;
                    }
                }

                // Update volume and 24h change in stats
                const statsElement = popcatItem.querySelector('.watchlist-stats');
                if (statsElement) {
                    const volume = parseFloat(pair.volume.h24);
                    const mcap = parseFloat(pair.fdv);
                    statsElement.innerHTML = `
                        <span>Vol ${formatNumber(volume)}</span>
                        <span>MCap: $${formatNumber(mcap)}</span>
                    `;
                }
            }
            
            // Update market card
            updateMarketCard('POPCAT', pair);
        }
    } catch (error) {
        console.error('Error fetching POPCAT data:', error);
    }
}

// Function to fetch JUP data from DexScreener
async function updateJUPData() {
    try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana/C1MgLojNLWBKADvu9BHdtgzz1oZX4dZ5zGdGcgvvW8Wz');
        const data = await response.json();
        const pair = data.pair;

        if (pair) {
            // Update watchlist item
            const jupItem = document.querySelector('.watchlist-item[data-symbol="JUP"]');
            if (jupItem) {
                // Update price with USD value
                const priceElement = jupItem.querySelector('.watchlist-price');
                if (priceElement) {
                    priceElement.textContent = `$${parseFloat(pair.priceUsd).toFixed(8)}`;
                }

                // Update 24h change
                const percentageElement = jupItem.querySelector('.title-percentage');
                if (percentageElement) {
                    const priceChange = parseFloat(pair.priceChange.h24);
                    percentageElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
                    percentageElement.className = `title-percentage ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    
                    // Update item class for glow effect
                    jupItem.className = `watchlist-item ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    if (jupItem.classList.contains('active')) {
                        jupItem.classList.add('active');
                    }
                    
                    // Update trend icon
                    const trendIcon = jupItem.querySelector('.material-icons-round');
                    if (trendIcon) {
                        trendIcon.textContent = priceChange >= 0 ? 'trending_up' : 'trending_down';
                        trendIcon.style.color = `var(--${priceChange >= 0 ? 'success' : 'danger'}-color)`;
                    }
                }

                // Update volume and 24h change in stats
                const statsElement = jupItem.querySelector('.watchlist-stats');
                if (statsElement) {
                    const volume = parseFloat(pair.volume.h24);
                    const mcap = parseFloat(pair.fdv);
                    statsElement.innerHTML = `
                        <span>Vol ${formatNumber(volume)}</span>
                        <span>MCap: $${formatNumber(mcap)}</span>
                    `;
                }
            }
            
            // Update market card
            updateMarketCard('JUP', pair);
        }
    } catch (error) {
        console.error('Error fetching JUP data:', error);
    }
}

// Function to fetch PENGU data from DexScreener
async function updatePENGUData() {
    try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana/B4Vwozy1FGtp8SELXSXydWSzavPUGnJ77DURV2k4MhUV');
        const data = await response.json();
        const pair = data.pair;

        if (pair) {
            // Update watchlist item
            const penguItem = document.querySelector('.watchlist-item[data-symbol="PENGU"]');
            if (penguItem) {
                // Update price with USD value
                const priceElement = penguItem.querySelector('.watchlist-price');
                if (priceElement) {
                    priceElement.textContent = `$${parseFloat(pair.priceUsd).toFixed(8)}`;
                }

                // Update 24h change
                const percentageElement = penguItem.querySelector('.title-percentage');
                if (percentageElement) {
                    const priceChange = parseFloat(pair.priceChange.h24);
                    percentageElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
                    percentageElement.className = `title-percentage ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    
                    // Update item class for glow effect
                    penguItem.className = `watchlist-item ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    if (penguItem.classList.contains('active')) {
                        penguItem.classList.add('active');
                    }
                    
                    // Update trend icon
                    const trendIcon = penguItem.querySelector('.material-icons-round');
                    if (trendIcon) {
                        trendIcon.textContent = priceChange >= 0 ? 'trending_up' : 'trending_down';
                        trendIcon.style.color = `var(--${priceChange >= 0 ? 'success' : 'danger'}-color)`;
                    }
                }

                // Update volume and 24h change in stats
                const statsElement = penguItem.querySelector('.watchlist-stats');
                if (statsElement) {
                    const volume = parseFloat(pair.volume.h24);
                    const mcap = parseFloat(pair.fdv);
                    statsElement.innerHTML = `
                        <span>Vol ${formatNumber(volume)}</span>
                        <span>MCap: $${formatNumber(mcap)}</span>
                    `;
                }
            }
            
            // Update market card
            updateMarketCard('PENGU', pair);
        }
    } catch (error) {
        console.error('Error fetching PENGU data:', error);
    }
}

// Function to fetch ZEUS data from DexScreener
async function updateZEUSData() {
    try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana/e5x7mwprg8pdaqbt5hj1ehu4crasgukux5mwcjutuszu');
        const data = await response.json();
        const pair = data.pair;

        if (pair) {
            // Update watchlist item
            const zeusItem = document.querySelector('.watchlist-item[data-symbol="ZEUS"]');
            if (zeusItem) {
                // Update price with USD value
                const priceElement = zeusItem.querySelector('.watchlist-price');
                if (priceElement) {
                    priceElement.textContent = `$${parseFloat(pair.priceUsd).toFixed(8)}`;
                }

                // Update 24h change
                const percentageElement = zeusItem.querySelector('.title-percentage');
                if (percentageElement) {
                    const priceChange = parseFloat(pair.priceChange.h24);
                    percentageElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
                    percentageElement.className = `title-percentage ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    
                    // Update item class for glow effect
                    zeusItem.className = `watchlist-item ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    if (zeusItem.classList.contains('active')) {
                        zeusItem.classList.add('active');
                    }
                    
                    // Update trend icon
                    const trendIcon = zeusItem.querySelector('.material-icons-round');
                    if (trendIcon) {
                        trendIcon.textContent = priceChange >= 0 ? 'trending_up' : 'trending_down';
                        trendIcon.style.color = `var(--${priceChange >= 0 ? 'success' : 'danger'}-color)`;
                    }
                }

                // Update volume and 24h change in stats
                const statsElement = zeusItem.querySelector('.watchlist-stats');
                if (statsElement) {
                    const volume = parseFloat(pair.volume.h24);
                    const mcap = parseFloat(pair.fdv);
                    statsElement.innerHTML = `
                        <span>Vol ${formatNumber(volume)}</span>
                        <span>MCap: $${formatNumber(mcap)}</span>
                    `;
                }
            }
            
            // Update market card
            updateMarketCard('ZEUS', pair);
        }
    } catch (error) {
        console.error('Error fetching ZEUS data:', error);
    }
}

// Function to fetch NOSANA data from DexScreener
async function updateNOSANAData() {
    try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana/dx76uas2ckv4f13kb5zkivd5rlevjyjrsxhnharaujvb');
        const data = await response.json();
        const pair = data.pair;

        if (pair) {
            // Update watchlist item
            const nosanaItem = document.querySelector('.watchlist-item[data-symbol="NOSANA"]');
            if (nosanaItem) {
                // Update price with USD value
                const priceElement = nosanaItem.querySelector('.watchlist-price');
                if (priceElement) {
                    priceElement.textContent = `$${parseFloat(pair.priceUsd).toFixed(8)}`;
                }

                // Update 24h change
                const percentageElement = nosanaItem.querySelector('.title-percentage');
                if (percentageElement) {
                    const priceChange = parseFloat(pair.priceChange.h24);
                    percentageElement.textContent = `${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`;
                    percentageElement.className = `title-percentage ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    
                    // Update item class for glow effect
                    nosanaItem.className = `watchlist-item ${priceChange >= 0 ? 'positive' : 'negative'}`;
                    if (nosanaItem.classList.contains('active')) {
                        nosanaItem.classList.add('active');
                    }
                    
                    // Update trend icon
                    const trendIcon = nosanaItem.querySelector('.material-icons-round');
                    if (trendIcon) {
                        trendIcon.textContent = priceChange >= 0 ? 'trending_up' : 'trending_down';
                        trendIcon.style.color = `var(--${priceChange >= 0 ? 'success' : 'danger'}-color)`;
                    }
                }

                // Update volume and 24h change in stats
                const statsElement = nosanaItem.querySelector('.watchlist-stats');
                if (statsElement) {
                    const volume = parseFloat(pair.volume.h24);
                    const mcap = parseFloat(pair.fdv);
                    statsElement.innerHTML = `
                        <span>Vol ${formatNumber(volume)}</span>
                        <span>MCap: $${formatNumber(mcap)}</span>
                    `;
                }
            }
            
            // Update market card
            updateMarketCard('NOSANA', pair);
        }
    } catch (error) {
        console.error('Error fetching NOSANA data:', error);
    }
}

// Function to update market card data
function updateMarketCard(symbol, pair) {
    const marketCards = document.querySelectorAll(`.market-card[data-symbol="${symbol}"]`);
    marketCards.forEach(marketCard => {
        if (marketCard) {
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
                
                // Update card class for styling
                marketCard.className = `market-card ${priceChange >= 0 ? 'positive' : 'negative'}`;
                
                // Update trend icon
                const trendIcon = marketCard.querySelector('.material-icons-round');
                if (trendIcon) {
                    trendIcon.textContent = priceChange >= 0 ? 'trending_up' : 'trending_down';
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
        }
    });
}

// Update all data every 10 seconds
setInterval(() => {
    updateWIFData();
    updatePOPCATData();
    updateJUPData();
    updatePENGUData();
    updateZEUSData();
    updateNOSANAData();
}, 10000);

// Initial updates
updateWIFData();
updatePOPCATData();
updateJUPData();
updatePENGUData();
updateZEUSData();
updateNOSANAData();

// Function to handle complete app loading
function handleAppLoaded() {
    if (appLoaded && fontsLoaded && contentLoaded) {
        const loadingOverlay = document.querySelector('.app-loading');
        const mainContent = document.querySelector('.main-content');
        
        // Set final text before fade out
        textScramble.setText('ZINC').then(() => {
            // Add loaded classes to trigger transitions
            setTimeout(() => {
                loadingOverlay.classList.add('loaded');
                mainContent.classList.add('loaded');
                
                // Remove loading overlay after transition
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 300);
            }, 500);
        });
    }
}

// Check if fonts are loaded
document.fonts.ready.then(() => {
    fontsLoaded = true;
    handleAppLoaded();
});

// Text Scramble Effect
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }
    
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => (this.resolve = resolve));
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 20);
            const end = start + Math.floor(Math.random() * 20);
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }
    
    update() {
        let output = '';
        let complete = 0;
        
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.4) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="glitch" data-char="${char}">${char}</span>`;
            } else {
                output += from;
            }
        }
        
        this.el.innerHTML = output;
        
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
    
    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// Initialize text scramble
const textScramble = new TextScramble(document.querySelector('.text-scramble'));
const phrases = ['ZINC', 'DEGEN', 'ZINC'];
let counter = 0;

const next = () => {
    textScramble.setText(phrases[counter]).then(() => {
        // Add finished class for glow effect
        textScramble.el.classList.add('finished');
        
        // Remove the finished class after animation completes
        setTimeout(() => {
            textScramble.el.classList.remove('finished');
            // Proceed to next phrase after a short delay
            setTimeout(() => {
                counter = (counter + 1) % phrases.length;
                if (!appLoaded || !fontsLoaded || !contentLoaded) {
                    next();
                }
            }, 200);
        }, 400);
    });
};

// Start text scramble animation
next();
