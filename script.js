// Sidebar Resizing with restrictions
const sidebar = document.querySelector('.sidebar');
const resizer = document.querySelector('.sidebar-resizer');
let isResizing = false;
let lastX = 0;

// Initialize loading state
let appLoaded = false;
let fontsLoaded = false;
let contentLoaded = false;

// Chart Style Toggle functionality
let currentChartStyle = 1; // 1 for candles, 3 for bars
let sideToolbarVisible = false; // Track side toolbar visibility state
let topToolbarVisible = false; // Track top toolbar visibility state

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

// Initialize TradingView widget with consistent settings
function initTradingViewWidget(container, symbol, interval) {
    // Hide calculator for TradingView
    window.hideCalculator();
    
    container.innerHTML = '';
    new TradingView.widget({
        "width": "100%",
        "height": "100%",
        "symbol": symbol,
        "interval": interval,
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": currentChartStyle,
        "locale": "en",
        "toolbar_bg": "#131722",
        "enable_publishing": false,
        "hide_side_toolbar": !sideToolbarVisible,
        "hide_top_toolbar": !topToolbarVisible,
        "allow_symbol_change": true,
        "save_image": false,
        "container_id": "tradingview_solana",
        "studies": [],
        "show_popup_button": false,
        "popup_width": "1000",
        "popup_height": "650",
        "backgroundColor": "#0a0a0f",
        "hide_volume": false
    });
}

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

// Update chart style function now uses initTradingViewWidget
function updateChartStyle(style) {
    currentChartStyle = style;
    const container = document.getElementById('tradingview_solana');
    const symbol = container.getAttribute('data-symbol') || 'BINANCE:SOLUSDT';
    const interval = container.getAttribute('data-interval') || '15';
    initTradingViewWidget(container, symbol, interval);
}

// Add click handler for chart style toggle
document.querySelector('.chart-controls .icon-btn:first-child').addEventListener('click', () => {
    const styleButton = document.querySelector('.chart-controls .icon-btn:first-child');
    const icon = styleButton.querySelector('.material-icons-round');
    
    // Toggle between styles: Candles (1) <-> Line (3)
    if (currentChartStyle === 1) {
        currentChartStyle = 3;
        icon.textContent = 'show_chart';
    } else {
        currentChartStyle = 1;
        icon.textContent = 'candlestick_chart';
    }
    
    updateChartStyle(currentChartStyle);
});

// Add click handler for drawing tools toggle
document.querySelector('.chart-controls .icon-btn:nth-child(2)').addEventListener('click', () => {
    const drawButton = document.querySelector('.chart-controls .icon-btn:nth-child(2)');
    const icon = drawButton.querySelector('.material-icons-round');
    
    // Toggle drawing tools visibility
    sideToolbarVisible = !sideToolbarVisible;
    
    // Update button appearance
    if (sideToolbarVisible) {
        drawButton.classList.add('active');
        icon.style.color = 'var(--primary-color)';
    } else {
        drawButton.classList.remove('active');
        icon.style.color = '';
    }
    
    // Update chart with new toolbar visibility
    updateChartStyle(currentChartStyle);
});

// Add click handler for widgets toggle
document.querySelector('.chart-controls .icon-btn:nth-child(3)').addEventListener('click', () => {
    const widgetsButton = document.querySelector('.chart-controls .icon-btn:nth-child(3)');
    const icon = widgetsButton.querySelector('.material-icons-round');
    
    // Toggle top toolbar visibility
    topToolbarVisible = !topToolbarVisible;
    
    // Update button appearance
    if (topToolbarVisible) {
        widgetsButton.classList.add('active');
        icon.style.color = 'var(--primary-color)';
    } else {
        widgetsButton.classList.remove('active');
        icon.style.color = '';
    }
    
    // Get current chart state
    const container = document.getElementById('tradingview_solana');
    const symbol = container.getAttribute('data-symbol') || 'BINANCE:SOLUSDT';
    const interval = container.getAttribute('data-interval') || '15';
    
    // Reinitialize chart with new toolbar state
    initTradingViewWidget(container, symbol, interval);
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
        // Hide calculator before showing TradingView
        window.hideCalculator();
        initTradingViewWidget(container, `BINANCE:${symbol}USDT`, '15');
        
        // Update webpage title
        document.title = `Zinc | ${symbol}/SOL`;
    });
});

// Function to show trending view
window.showTrendingView = function() {
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
        
        // Restore chart style button state
        const styleButton = chartControls.querySelector('.icon-btn:first-child');
        const styleIcon = styleButton.querySelector('.material-icons-round');
        styleIcon.textContent = currentChartStyle === 1 ? 'candlestick_chart' : 'show_chart';
        
        // Restore drawing tools button state
        const drawButton = chartControls.querySelector('.icon-btn:nth-child(2)');
        const drawIcon = drawButton.querySelector('.material-icons-round');
        if (sideToolbarVisible) {
            drawButton.classList.add('active');
            drawIcon.style.color = 'var(--primary-color)';
        } else {
            drawButton.classList.remove('active');
            drawIcon.style.color = '';
        }
    }
    
    // Restore original header
    sectionHeader.innerHTML = `
        <div class="section-title">
            <span class="material-icons-round" style="animation: glowPulse 2s ease-in-out infinite;">trending_up</span>
            Degen Trending
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
    
    // Reset to TradingView widget with preserved settings
    const container = document.getElementById('tradingview_solana');
    container.innerHTML = '';
    container.style = ''; // Reset any custom styles
    
    // Create new TradingView widget with preserved settings
    new TradingView.widget({
        "width": "100%",
        "height": "100%",
        "symbol": "BINANCE:SOLUSDT",
        "interval": "15",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": currentChartStyle,
        "locale": "en",
        "toolbar_bg": "#131722",
        "enable_publishing": false,
        "hide_side_toolbar": !sideToolbarVisible,
        "allow_symbol_change": true,
        "save_image": false,
        "container_id": "tradingview_solana",
        "hide_top_toolbar": true,
        "studies": [],
        "show_popup_button": false,
        "popup_width": "1000",
        "popup_height": "650",
        "backgroundColor": "#0a0a0f",
        "hide_volume": false
    });
    
    // Hide calculator for initial TradingView
    window.hideCalculator();
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
        if (!isActive) {
            // Opening sidebar
            sidebar.style.visibility = 'visible';
            sidebar.style.opacity = '1';
            sidebar.style.transform = 'translateX(0)';
            sidebar.classList.add('active');
            lockBodyScroll();
        } else {
            // Closing sidebar
            sidebar.style.transform = 'translateX(-100%)';
            sidebar.style.opacity = '0';
            sidebar.classList.remove('active');
            // Delay hiding visibility until after transition
            setTimeout(() => {
                if (!sidebar.classList.contains('active')) {
                    sidebar.style.visibility = 'hidden';
                }
            }, 300); // Match transition duration
            unlockBodyScroll();
        }
    });
};

// Expose toggleSidebar to window object
window.toggleSidebar = toggleSidebar;

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
        sidebar.style.visibility = 'hidden';
        sidebar.style.opacity = '0';
        sidebar.style.transform = 'translateX(-100%)';
        
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
    const watchlistPopup = document.querySelector('.watchlist-popup');
    
    // Don't close sidebar if clicking inside watchlist popup
    if (watchlistPopup && watchlistPopup.contains(e.target)) {
        return;
    }
    
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
    
    // Hide calculator for initial TradingView
    window.hideCalculator();
    
    // Delay non-critical initializations
    requestAnimationFrame(() => {
        initMarketCardsAnimation();
    });
}, { passive: true });

// Add resize event listener
window.addEventListener('resize', () => {
    checkMobileView();
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

// Cache for recent searches
const searchCache = new Map();
const CACHE_EXPIRY = 30000; // 30 seconds

// Function to search DexScreener pairs with caching
async function searchDexScreenerPairs(query) {
    if (!query) return;
    
    // Add loading state
    searchBar.classList.add('is-loading');
    
    // Check cache first
    const cacheKey = query.toLowerCase();
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_EXPIRY) {
        searchBar.classList.remove('is-loading');
        return cachedResult.pairs;
    }
    
    try {
        // Add chain filter directly in the query for better performance
        const response = await fetch(`https://api.dexscreener.com/latest/dex/search/?q=${encodeURIComponent(query)}%20chain%3Asolana`);
        const data = await response.json();
        
        // Additional filter to ensure only Solana pairs
        const solanaPairs = (data.pairs || []).filter(pair => pair.chainId === 'solana');
        
        // Cache the filtered result
        searchCache.set(cacheKey, {
            pairs: solanaPairs,
            timestamp: Date.now()
        });
        
        // Remove loading state
        searchBar.classList.remove('is-loading');
        
        return solanaPairs;
    } catch (error) {
        console.error('Error searching pairs:', error);
        // Remove loading state on error
        searchBar.classList.remove('is-loading');
        return [];
    }
}

// Optimize DOM operations in result display
function displaySearchResults(pairs) {
    let resultsContainer = document.querySelector('.search-results');
    
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        document.querySelector('.search-bar').appendChild(resultsContainer);
    }
    
    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Filter for Solana pairs only
    const solanaPairs = pairs.filter(pair => pair.chainId === 'solana');
    
    if (solanaPairs.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No pairs found on Solana';
        fragment.appendChild(noResults);
    } else {
        // Pre-calculate reused values
        const formatter = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        });
        
        solanaPairs.slice(0, 10).forEach(pair => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            
            const price = parseFloat(pair.priceUsd);
            const formattedPrice = price < 0.01 ? 
                formatter.format(price) : 
                formatter.format(price);

            const priceChange24h = parseFloat(pair.priceChange.h24);
            const priceChangeClass = priceChange24h >= 0 ? 'positive' : 'negative';
            const priceChangeSign = priceChange24h >= 0 ? '+' : '';

            const shortContractAddress = pair.baseToken.address ? 
                `${pair.baseToken.address.slice(0, 6)}...${pair.baseToken.address.slice(-4)}` : '';
            const shortPairAddress = pair.pairAddress ? 
                `${pair.pairAddress.slice(0, 6)}...${pair.pairAddress.slice(-4)}` : '';
            
            // Use template literal for better performance than complex DOM creation
            resultItem.innerHTML = `
                <div class="result-pair">
                    <div class="result-symbol">
                        ${pair.baseToken.symbol}/${pair.quoteToken.symbol}
                        <span class="chain-tag" data-chain="sol">SOL</span>
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
                    <div class="chain-tag" data-dex="${pair.dexId.toLowerCase()}" style="margin: 0 0 4px 0;">${pair.dexId}</div>
                    <div class="result-price">$${formattedPrice}</div>
                    <div class="result-volume">Vol $${formatVolume(pair.volume.h24)}</div>
                    <div class="result-mcap">MCap $${formatVolume(pair.fdv)}</div>
                </div>
            `;
            
            // Use event delegation for better performance
            resultItem.addEventListener('click', () => {
                showPairChart(pair);
                clearSearch();
            });
            
            fragment.appendChild(resultItem);
        });
    }
    
    // Clear and append in one operation
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(fragment);
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

// Input handling with optimized debounce
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    searchBar.classList.toggle('has-value', query.length > 0);
    
    if (query.length >= 2) {
        searchBar.classList.add('is-loading');
        debouncedSearch(query);
    } else {
        searchBar.classList.remove('is-loading');
        const resultsContainer = document.querySelector('.search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }
});

// Reduce debounce time for faster response
const debouncedSearch = debounce(async (query) => {
    try {
        const pairs = await searchDexScreenerPairs(query);
        displaySearchResults(pairs);
    } finally {
        searchBar.classList.remove('is-loading');
    }
}, 150); // Reduced from 300ms to 150ms for faster response

// Clear button
clearBtn.addEventListener('click', () => {
    searchBar.classList.remove('is-loading');
    clearSearch();
});

// Close search results when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) {
        const resultsContainer = document.querySelector('.search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }
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

// Add keyboard shortcut handler
document.addEventListener('keydown', function(e) {
    // Check if Ctrl+K was pressed
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); // Prevent default browser behavior
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.focus();
        }
    }
});
