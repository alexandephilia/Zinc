class WalletTracker {
    constructor() {
        this.walletSheet = document.querySelector('.wallet-tracker-sheet');
        this.closeBtn = document.querySelector('.close-wallet-sheet');
        this.walletBtn = document.querySelector('.wallet-btn');
        this.addWalletBtn = document.querySelector('.add-wallet-btn');
        this.walletInput = document.querySelector('#walletAddressInput');
        this.trackedWalletsContainer = document.querySelector('.tracked-wallets');
        this.trackedWallets = new Map();
        this.tokenMetadataCache = new Map();
        this.updateIntervals = new Map();
        
        // Create modals container if it doesn't exist
        if (!document.querySelector('.wallet-modals')) {
            const modalsContainer = document.createElement('div');
            modalsContainer.className = 'wallet-modals';
            document.body.appendChild(modalsContainer);
        }
        
        // Initialize Solana connection using Jupiter's RPC
        this.connection = new solanaWeb3.Connection('https://mainnet.helius-rpc.com/?api-key=28ed041d-fd1f-47f3-8217-f87e8c1126a7');
        
        // Load saved wallets from localStorage
        this.loadSavedWallets();
        this.initializeEventListeners();
    }

    loadSavedWallets() {
        const savedWallets = localStorage.getItem('trackedWallets');
        if (savedWallets) {
            const walletData = JSON.parse(savedWallets);
            if (Object.keys(walletData).length > 0) {
                Object.entries(walletData).forEach(([address, data]) => {
                    this.trackedWallets.set(address, data);
                    this.createWalletCard(address, data.name || null);
                    this.trackWallet(address);
                });
            } else {
                this.showNoWalletsMessage();
            }
        } else {
            this.showNoWalletsMessage();
        }
    }

    showNoWalletsMessage() {
        this.trackedWalletsContainer.innerHTML = `
            <div class="no-wallets-message">
                <span>No wallets tracked yet</span>
            </div>
        `;
    }

    saveWalletsToCache() {
        const walletData = {};
        this.trackedWallets.forEach((data, address) => {
            walletData[address] = data;
        });
        localStorage.setItem('trackedWallets', JSON.stringify(walletData));
    }

    initializeEventListeners() {
        // Toggle wallet sheet
        this.walletBtn.addEventListener('click', () => this.toggleWalletSheet());
        
        // Prevent closing sidebar when clicking inside wallet sheet
        this.walletSheet.addEventListener('click', (e) => {
            e.stopPropagation();  // This prevents the click from reaching the document
        });

        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeWalletSheet();
        });

        // Add wallet
        this.addWalletBtn.addEventListener('click', () => this.addWallet());
        this.walletInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addWallet();
        });
    }

    toggleWalletSheet() {
        this.walletSheet.classList.toggle('active');
    }

    closeWalletSheet() {
        this.walletSheet.classList.remove('active');
    }

    async addWallet() {
        const address = this.walletInput.value.trim();
        if (!address) return;

        if (this.trackedWallets.has(address)) {
            this.showCustomError('Déjà fucking vu! This wallet\'s already in the system!', 'warning');
            return;
        }

        try {
            // Validate the address format (basic check)
            if (address.length !== 44) {
                this.showCustomError('For fuck\'s sake, did you just mash random keys? Enter a 44 character Solana address!', 'error');
                    return;
            }

            // Clear no wallets message if it exists
            if (this.trackedWallets.size === 0) {
                this.trackedWalletsContainer.innerHTML = '';
            }

            // Add to tracked wallets with default data
            this.trackedWallets.set(address, { name: null });
            await this.createWalletCard(address);
            this.walletInput.value = '';
            
            // Save to cache
            this.saveWalletsToCache();
            
            // Start tracking this wallet
            this.trackWallet(address);
        } catch (error) {
            alert('Error adding wallet: ' + error.message);
        }
    }

    showRenameModal(address, currentName, callback) {
        const modalsContainer = document.querySelector('.wallet-modals');
        const modal = document.createElement('div');
        modal.className = 'wallet-modal rename-modal';
        modal.innerHTML = `
            <div class="wallet-modal-content">
                <div class="modal-header">
                    <span class="material-icons-round">edit</span>
                    Rename Wallet
                </div>
                <div class="modal-body">
                    <div class="input-group">
                        <input type="text" class="rename-input" placeholder="Enter wallet name" value="${currentName || ''}">
                    </div>
                    <div class="wallet-address-display">${this.formatAddress(address)}</div>
                </div>
                <div class="modal-actions">
                    <button class="cancel-btn">
                        <span class="material-icons-round">close</span>
                        Cancel
                    </button>
                    <button class="confirm-btn">
                        <span class="material-icons-round">check</span>
                        Save
                    </button>
                </div>
            </div>
        `;

        modalsContainer.appendChild(modal);
        
        // Add animation class after a frame
        requestAnimationFrame(() => modal.classList.add('active'));

        const input = modal.querySelector('.rename-input');
        input.focus();
        input.select();

        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        modal.querySelector('.confirm-btn').addEventListener('click', () => {
            const newName = input.value.trim();
            callback(newName);
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const newName = input.value.trim();
                callback(newName);
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    showDeleteModal(address, callback) {
        // Get the latest name from trackedWallets
        const currentWalletData = this.trackedWallets.get(address) || {};
        const currentName = currentWalletData.name;

        const modalsContainer = document.querySelector('.wallet-modals');
        const modal = document.createElement('div');
        modal.className = 'wallet-modal delete-modal';
        modal.innerHTML = `
            <div class="wallet-modal-content">
                <div class="modal-header">
                    <span class="material-icons-round">delete_outline</span>
                    Remove Wallet
                </div>
                <div class="modal-body">
                    <div class="delete-warning">
                        <span class="material-icons-round">warning</span>
                        Remove this wallet?
                    </div>
                    <div class="wallet-info">
                        <div class="wallet-name">${currentName || 'Unnamed Wallet'}</div>
                        <div class="wallet-address-display">${this.formatAddress(address)}</div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="cancel-btn">
                        <span class="material-icons-round">close</span>
                        Cancel
                    </button>
                    <button class="delete-btn">
                        <span class="material-icons-round">delete</span>
                        Remove
                    </button>
                </div>
            </div>
        `;

        modalsContainer.appendChild(modal);
        
        // Add animation class after a frame
        requestAnimationFrame(() => modal.classList.add('active'));

        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        modal.querySelector('.delete-btn').addEventListener('click', () => {
            callback();
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
    }

    async createWalletCard(address, name = null) {
        const card = document.createElement('div');
        card.className = 'wallet-card';
        card.innerHTML = `
            <div class="wallet-header">
                <div class="wallet-name" title="Click to rename">
                    ${name || this.formatAddress(address)}
                    <span class="material-icons-round edit-icon">edit</span>
                </div>
                <button class="remove-wallet">
                    <span class="material-icons-round">close</span>
                </button>
            </div>
            <div class="wallet-address" title="Click to copy address">${this.formatAddress(address)}</div>
            <div class="wallet-separator"></div>
            <div class="wallet-holdings collapsed" id="holdings-${address}">
                <div class="loading">Loading holdings...</div>
                <button class="expand-holdings">
                    <span class="material-icons-round">expand_more</span>
                    <span class="expand-text">Show More</span>
                </button>
            </div>
        `;

        // Add click handler for expand/collapse
        const holdingsContainer = card.querySelector('.wallet-holdings');
        const expandBtn = card.querySelector('.expand-holdings');
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            holdingsContainer.classList.toggle('collapsed');
            const expandText = expandBtn.querySelector('.expand-text');
            expandText.textContent = holdingsContainer.classList.contains('collapsed') ? 'Show More' : 'Show Less';
        });

        // Add click handler for wallet address copy
        const addressElement = card.querySelector('.wallet-address');
        addressElement.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(address);
                
                // Save the original content
                const originalContent = addressElement.innerHTML;
                
                // Replace with success message using new unique classes
                addressElement.innerHTML = `
                    <div class="wallet-copy-success-content">
                        <span class="material-icons-round">check_circle</span>
                        <span class="wallet-copy-success-text">Address copied!</span>
                    </div>
                `;
                
                // Add the success class
                addressElement.classList.add('wallet-copy-success');
                
                // Restore original content after animation
                setTimeout(() => {
                    addressElement.innerHTML = originalContent;
                    addressElement.classList.remove('wallet-copy-success');
                }, 1000);
            } catch (err) {
                console.error('Failed to copy address:', err);
            }
        });

        // Add rename functionality with custom modal
        const nameElement = card.querySelector('.wallet-name');
        nameElement.addEventListener('click', () => {
            this.showRenameModal(address, name, (newName) => {
                if (newName !== null) {
                    const walletData = this.trackedWallets.get(address) || {};
                    walletData.name = newName || null;
                    this.trackedWallets.set(address, walletData);
                    nameElement.innerHTML = `
                        ${newName || this.formatAddress(address)}
                        <span class="material-icons-round edit-icon">edit</span>
                    `;
                    this.saveWalletsToCache();
                }
            });
        });

        // Add remove wallet functionality with custom modal
        const removeBtn = card.querySelector('.remove-wallet');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDeleteModal(address, () => {
                this.trackedWallets.delete(address);
                card.remove();
                this.saveWalletsToCache();
                
                // Show no wallets message if this was the last wallet
                if (this.trackedWallets.size === 0) {
                    this.showNoWalletsMessage();
                }
            });
        });

        this.trackedWalletsContainer.appendChild(card);
    }

    formatAddress(address) {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }

    async trackWallet(address) {
        // Clear any existing interval for this wallet
        if (this.updateIntervals.has(address)) {
            clearInterval(this.updateIntervals.get(address));
        }

        const updateHoldings = async () => {
            try {
                const holdings = await this.fetchWalletHoldings(address);
                await this.updateWalletCard(address, holdings);
            } catch (error) {
                console.error('Error fetching wallet holdings:', error);
            }
        };

        // Initial update
        await updateHoldings();
        
        // Update every 2 minutes instead of 30 seconds
        const intervalId = setInterval(updateHoldings, 120000);
        this.updateIntervals.set(address, intervalId);
    }

    async fetchWalletHoldings(address) {
        try {
            console.log('Fetching holdings for address:', address);
            
            // First, verify the address is valid
            const pubKey = new solanaWeb3.PublicKey(address);
            console.log('Public key created successfully:', pubKey.toString());

            // Get native SOL balance
            const solBalance = await this.connection.getBalance(pubKey);
            console.log('SOL balance:', solBalance / solanaWeb3.LAMPORTS_PER_SOL);

            // Get all token accounts owned by this wallet
            console.log('Fetching token accounts...');
            const accounts = await this.connection.getParsedTokenAccountsByOwner(
                pubKey,
                {
                    programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
                }
            );
            
            console.log('Raw accounts data:', accounts);

            if (!accounts || !accounts.value) {
                console.error('No accounts data returned');
                return [];
            }

            // Start with SOL balance
            const holdings = [{
                tokenSymbol: 'SOL',
                tokenAmount: {
                    uiAmount: solBalance / solanaWeb3.LAMPORTS_PER_SOL,
                    uiAmountString: (solBalance / solanaWeb3.LAMPORTS_PER_SOL).toString()
                },
                mint: 'So11111111111111111111111111111111111111112', // Native SOL mint address
                isNativeSol: true
            }];

            // Add other token holdings
            const tokenHoldings = accounts.value.map(account => {
                const parsedInfo = account.account.data.parsed.info;
                console.log('Parsed token info:', parsedInfo);
                
                return {
                    tokenSymbol: null, // We'll need to fetch this separately
                    tokenAmount: {
                        uiAmount: parsedInfo.tokenAmount.uiAmount,
                        uiAmountString: parsedInfo.tokenAmount.uiAmount.toString()
                    },
                    mint: parsedInfo.mint,
                    isNativeSol: false
                };
            }).filter(token => token.tokenAmount.uiAmount > 0);

            holdings.push(...tokenHoldings);

            console.log('Processed holdings:', holdings);
            return holdings;

        } catch (error) {
            console.error('Detailed error in fetchWalletHoldings:', {
                error: error,
                message: error.message,
                stack: error.stack
            });
            
            // Check for specific error types
            if (error.message.includes('Invalid public key input')) {
                throw new Error('Invalid wallet address format');
            } else if (error.message.includes('Network request failed')) {
                throw new Error('Network error - please try again');
            }
            
            throw new Error(`Failed to fetch wallet holdings: ${error.message}`);
        }
    }

    async updateWalletCard(address, holdings) {
        console.log('Updating wallet card for address:', address, 'with holdings:', holdings);
        
        const holdingsContainer = document.querySelector(`#holdings-${address}`);
        if (!holdingsContainer) {
            console.error('Holdings container not found for address:', address);
            return;
        }

        // Preserve the collapsed state
        const wasCollapsed = holdingsContainer.classList.contains('collapsed');
        const expandBtn = holdingsContainer.querySelector('.expand-holdings');

        if (!holdings || holdings.length === 0) {
            console.log('No holdings found for address:', address);
            holdingsContainer.innerHTML = `
                <div class="no-holdings">No tokens found</div>
                ${expandBtn ? expandBtn.outerHTML : ''}
            `;
            return;
        }

        try {
            // Sort holdings by amount (but keep SOL first)
            const sortedHoldings = holdings.sort((a, b) => {
                if (a.isNativeSol) return -1;
                if (b.isNativeSol) return 1;
                return (parseFloat(b.tokenAmount.uiAmountString) * (b.tokenAmount.uiPrice || 1)) - 
                       (parseFloat(a.tokenAmount.uiAmountString) * (a.tokenAmount.uiPrice || 1));
            });

            // Create container for holdings
            holdingsContainer.innerHTML = `
                <div class="holdings-list"></div>
                <button class="expand-holdings">
                    <span class="material-icons-round">expand_more</span>
                    <span class="expand-text">${wasCollapsed ? 'Show More' : 'Show Less'}</span>
                </button>
            `;
            const holdingsList = holdingsContainer.querySelector('.holdings-list');

            // Restore collapsed state
            if (wasCollapsed) {
                holdingsContainer.classList.add('collapsed');
            }

            // Add click handler for new expand button
            const newExpandBtn = holdingsContainer.querySelector('.expand-holdings');
            newExpandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                holdingsContainer.classList.toggle('collapsed');
                const expandText = newExpandBtn.querySelector('.expand-text');
                expandText.textContent = holdingsContainer.classList.contains('collapsed') ? 'Show More' : 'Show Less';
            });

            // First, show SOL balance immediately
            const solToken = sortedHoldings.find(t => t.isNativeSol);
            if (solToken) {
                const solMetadata = await this.getTokenMetadata(solToken.mint);
                const solUsdValue = solMetadata?.priceUsd ? 
                    (solToken.tokenAmount.uiAmount * parseFloat(solMetadata.priceUsd)).toFixed(2) : null;
                
                const holdingHTML = `
                    <div class="token-holding" data-address="So11111111111111111111111111111111111111112">
                        <div class="token-info">
                            <span title="Solana">SOL</span>
                        </div>
                        <div class="token-values">
                            <span class="token-amount">${this.formatAmount(solToken.tokenAmount.uiAmount)}</span>
                            ${solUsdValue ? `<span class="token-usd">$${this.formatUsdValue(solUsdValue)}</span>` : ''}
                        </div>
                    </div>
                `;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = holdingHTML;
                const holdingElement = tempDiv.firstElementChild;
                this.addCopyToClipboardHandler(holdingElement);
                holdingsList.appendChild(holdingElement);
            }

            // Batch process other tokens
            const otherTokens = sortedHoldings.filter(t => !t.isNativeSol);
            const tokenMetadataPromises = otherTokens.map(token => this.getTokenMetadata(token.mint));
            
            // Wait for all metadata to be fetched
            const tokenMetadataResults = await Promise.allSettled(tokenMetadataPromises);
            
            // Process results and update UI
            otherTokens.forEach((token, index) => {
                const metadataResult = tokenMetadataResults[index];
                if (metadataResult.status === 'fulfilled' && metadataResult.value) {
                    const tokenInfo = metadataResult.value;
                    const usdValue = tokenInfo.priceUsd ? 
                        (token.tokenAmount.uiAmount * parseFloat(tokenInfo.priceUsd)).toFixed(2) : null;
                    
                    const holdingHTML = `
                        <div class="token-holding" data-address="${token.mint}">
                            <div class="token-info">
                                <span title="${tokenInfo.name}">${tokenInfo.symbol}</span>
                            </div>
                            <div class="token-values">
                                <span class="token-amount">${this.formatAmount(token.tokenAmount.uiAmount)}</span>
                                ${usdValue ? `<span class="token-usd">$${this.formatUsdValue(usdValue)}</span>` : ''}
                            </div>
                        </div>
                    `;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = holdingHTML;
                    const holdingElement = tempDiv.firstElementChild;
                    this.addCopyToClipboardHandler(holdingElement);
                    holdingsList.appendChild(holdingElement);
                }
            });

            // If no tokens were added (except SOL), show no holdings message
            if (holdingsList.children.length === 0) {
                holdingsContainer.innerHTML = '<div class="no-holdings">No tokens found</div>';
            }

            console.log('Wallet card updated successfully');
            
        } catch (error) {
            console.error('Error updating wallet card:', error);
            holdingsContainer.innerHTML = '<div class="error">Error loading tokens</div>';
        }
    }

    async getTokenMetadata(mint) {
        // Check cache first
        if (this.tokenMetadataCache.has(mint)) {
            return this.tokenMetadataCache.get(mint);
        }

        try {
            console.log('Fetching metadata for mint:', mint);
            
            // Use DexScreener's API to get token information
            const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
            const data = await response.json();
            console.log('DexScreener response:', data); // Add logging
            
            let tokenInfo = null;
            
            // If we have valid token data
            if (data.pairs && data.pairs.length > 0) {
                // Find the first Solana pair with good liquidity
                const solanaPair = data.pairs
                    .filter(pair => pair.chainId === 'solana')
                    .sort((a, b) => parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0))[0];

                if (solanaPair) {
                    // Special case for SOL
                    if (mint === 'So11111111111111111111111111111111111111112') {
                        tokenInfo = {
                            symbol: 'SOL',
                            name: 'Solana',
                            address: mint,
                            priceUsd: solanaPair.priceUsd
                        };
                    } else {
                        tokenInfo = {
                            symbol: solanaPair.baseToken.symbol,
                            name: solanaPair.baseToken.name,
                            address: mint,
                            priceUsd: solanaPair.priceUsd
                        };
                    }
                }
            }
            
            // Cache the result (even if null)
            this.tokenMetadataCache.set(mint, tokenInfo);
            console.log('Token info:', tokenInfo); // Add logging
            
            return tokenInfo;
        } catch (error) {
            console.error('Error fetching token metadata:', error);
            return null;
        }
    }

    formatAmount(amount) {
        if (!amount) return '0';
        return amount.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 9
        });
    }

    formatUsdValue(value) {
        const num = parseFloat(value);
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    }

    addCopyToClipboardHandler(element) {
        element.style.cursor = 'pointer';
        element.addEventListener('click', async () => {
            const address = element.getAttribute('data-address');
            try {
                await navigator.clipboard.writeText(address);
                
                // Save the original content
                const originalContent = element.innerHTML;
                
                // Replace with success message while maintaining exact layout
                element.innerHTML = `
                    <div class="copy-success-content">
                        <div class="token-info">
                            <span class="material-icons-round">check_circle</span>
                            <span>Address copied!</span>
                        </div>
                        <div class="token-values">
                            <span class="token-amount">&nbsp;</span>
                            <span class="token-usd">&nbsp;</span>
                        </div>
                    </div>
                `;
                
                // Add the success class for animation
                element.classList.add('copy-success');
                
                // Restore original content after animation
                setTimeout(() => {
                    element.innerHTML = originalContent;
                    element.classList.remove('copy-success');
                }, 1000);
            } catch (err) {
                console.error('Failed to copy address:', err);
            }
        });
    }

    showCustomError(message, type = 'error') {
        const errorDiv = document.createElement('div');
        errorDiv.className = `custom-error-message ${type}`;
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="material-icons-round">${type === 'error' ? 'error' : 'warning'}</span>
                <span class="error-text">${message}</span>
            </div>
        `;
        
        // Remove any existing error messages with smooth animation
        const existingError = document.querySelector('.custom-error-message');
        if (existingError) {
            existingError.classList.add('removing');
            setTimeout(() => existingError.remove(), 400); // Match animation duration
        }
        
        // Insert after the input group
        const inputGroup = document.querySelector('.wallet-input-section');
        inputGroup.appendChild(errorDiv);
        
        // Add active class after a frame for animation
        requestAnimationFrame(() => {
            errorDiv.classList.add('active');
        });
        
        // Remove with smooth exit animation
        setTimeout(() => {
            errorDiv.classList.add('removing');
            errorDiv.classList.remove('active');
            // Wait for exit animation to complete
            setTimeout(() => errorDiv.remove(), 400); // Match animation duration
        }, 3000);
    }
}

// Initialize wallet tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WalletTracker();
}); 