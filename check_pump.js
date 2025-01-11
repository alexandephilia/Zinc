// Create a global object that works in both Node.js and browser
const globalObject = typeof window !== 'undefined' ? window : {};
globalObject.TOKEN_DEPLOYERS = {};

// Rate limiting configuration
const API_CONFIG = {
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
    const timeSinceLastFetch = now - API_CONFIG.lastFetchTimestamp;
    
    // Enforce minimum interval between requests
    if (timeSinceLastFetch < API_CONFIG.minFetchInterval) {
        await new Promise(resolve => 
            setTimeout(resolve, API_CONFIG.minFetchInterval - timeSinceLastFetch)
        );
    }

    // If in cooldown, wait
    if (API_CONFIG.rateLimitCooldown) {
        await new Promise(resolve => 
            setTimeout(resolve, API_CONFIG.maxBackoffDelay)
        );
        API_CONFIG.rateLimitCooldown = false;
    }

    try {
        API_CONFIG.lastFetchTimestamp = Date.now();
        const result = await apiCall();
        
        // Reset error count on success
        API_CONFIG.consecutiveErrors = 0;
        API_CONFIG.backoffDelay = 1000;
        
        return result;
    } catch (error) {
        // Handle rate limiting specifically
        if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit') || error.message.includes('1015')) {
            API_CONFIG.rateLimitCooldown = true;
            API_CONFIG.consecutiveErrors++;
            
            // Exponential backoff
            const backoffDelay = Math.min(
                API_CONFIG.backoffDelay * Math.pow(2, API_CONFIG.consecutiveErrors),
                API_CONFIG.maxBackoffDelay
            );
            
            console.warn(`Rate limit detected, backing off for ${backoffDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
        throw error;
    }
}

async function getTokenDeployer(tokenAddress) {
    try {
        const connection = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com');
        const mintInfo = await connection.getParsedAccountInfo(new solanaWeb3.PublicKey(tokenAddress));
        
        if (mintInfo?.value?.data?.parsed?.info?.mintAuthority) {
            const mintAuthority = mintInfo.value.data.parsed.info.mintAuthority;
            console.log('Found mint authority:', mintAuthority);
            return mintAuthority;
        }
        
        // Fallback to token program if no mint authority
        if (mintInfo?.value?.owner) {
            console.log('Found token program:', mintInfo.value.owner.toString());
            return mintInfo.value.owner.toString();
        }
    } catch (error) {
        console.error('Error getting deployer:', error);
    }
    return null;
}

async function getDexScreenerData(tokenAddress) {
    try {
        const response = await withRateLimit(() => 
            fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Origin': 'https://dexscreener.com',
                    'Referer': 'https://dexscreener.com/',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            })
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
            // Find the first Solana pair with good liquidity
            const solanaPair = data.pairs
                .filter(pair => pair.chainId === 'solana')
                .sort((a, b) => parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0))[0];

            if (solanaPair) {
                console.log('Found DexScreener data:', {
                    name: solanaPair.baseToken.name,
                    symbol: solanaPair.baseToken.symbol,
                    price: solanaPair.priceUsd
                });
                return solanaPair;
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting DexScreener data:', error);
        return null;
    }
}

async function indexToken(tokenAddress) {
    console.log('\nProcessing token:', tokenAddress);
    
    try {
        // Get deployer first
        const deployer = await getTokenDeployer(tokenAddress);
        if (!deployer) {
            console.log('No deployer found for token');
            return null;
        }
        
        console.log('Found deployer:', deployer);
        
        // Get DexScreener data
        const pairData = await getDexScreenerData(tokenAddress);
        if (!pairData) {
            console.log('No DexScreener data found');
            return null;
        }
        
        // Store the data
        if (!globalObject.TOKEN_DEPLOYERS[deployer]) {
            globalObject.TOKEN_DEPLOYERS[deployer] = {};
        }
        
        const tokenData = {
            address: tokenAddress,
            name: pairData.baseToken.name,
            symbol: pairData.baseToken.symbol,
            deployer: deployer,
            pairAddress: pairData.pairAddress,
            price: pairData.priceUsd,
            volume24h: pairData.volume?.h24,
            createdAt: pairData.pairCreatedAt
        };
        
        globalObject.TOKEN_DEPLOYERS[deployer][tokenAddress] = tokenData;
        
        console.log('\nToken Info:');
        console.log('Name:', tokenData.name);
        console.log('Symbol:', tokenData.symbol);
        console.log('Deployer:', deployer);
        console.log('Price:', tokenData.price);
        console.log('Volume 24h:', tokenData.volume24h);
        
        return tokenData;
    } catch (error) {
        console.error('Error indexing token:', error);
        return null;
    }
}

// Function to get all tokens by a deployer
function getTokensByDeployer(deployerAddress) {
    return globalObject.TOKEN_DEPLOYERS[deployerAddress] || {};
}

// Export for browser
if (typeof window !== 'undefined') {
    window.indexToken = indexToken;
    window.getTokensByDeployer = getTokensByDeployer;
    window.getTokenDeployer = getTokenDeployer;
}
