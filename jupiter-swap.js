document.addEventListener('DOMContentLoaded', () => {
    // RPC configuration
    const rpcEndpoints = [
        'https://mainnet.helius-rpc.com/?api-key=864eec10-224c-49c8-a275-fcd031e4c2d7',
        'https://go.getblock.io/285683280f0e4402aed5d9a7788d8bef'
    ];
    let currentRpcIndex = 0;

    // Function to initialize Jupiter with current RPC
    const initJupiter = (rpcEndpoint) => {
        window.Jupiter.init({
            displayMode: "integrated",
            integratedTargetId: "integrated-terminal",
            endpoint: rpcEndpoint,
            platformFeeAndAccounts: {
                feeBps: 10,
                feeAccounts: {}
            },
            formProps: {
                initialAmount: "10000000",
            },
            defaultExplorer: "Solscan",
            containerStyles: {
                width: '100%',
                minHeight: window.innerWidth <= 768 ? '38em' : '35em',
                border: 'none', 
                borderRadius: '0',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column'
            },
            containerClassName: 'jupiter-terminal-container',
            theme: {
                palette: {
                    mode: 'dark',
                    primary: {
                        main: '#2962ff',
                    },
                    background: {
                        default: '#0a0a0f',
                        paper: '#12121a',
                    },
                },
                components: {
                    MuiDialog: {
                        styleOverrides: {
                            paper: {
                                backgroundColor: 'var(--secondary-bg)',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.32)',
                                color: 'var(--text-primary)',
                            }
                        }
                    },
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                fontFamily: "'Roboto Mono', monospace",
                                textTransform: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 500,
                                padding: '8px 16px',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(41, 98, 255, 0.2)',
                                }
                            }
                        }
                    },
                    MuiTypography: {
                        styleOverrides: {
                            root: {
                                fontFamily: "'Roboto Mono', monospace",
                                color: 'var(--text-primary)',
                            }
                        }
                    },
                    MuiIconButton: {
                        styleOverrides: {
                            root: {
                                color: 'var(--text-secondary)',
                                '&:hover': {
                                    backgroundColor: 'var(--tertiary-bg)',
                                }
                            }
                        }
                    }
                }
            },
            onError: (error) => {
                console.error('Jupiter Terminal error:', error);
                // If we get an RPC error, try switching to the fallback RPC
                if (error.message && (
                    error.message.includes('Failed to fetch') || 
                    error.message.includes('Network Error') ||
                    error.message.includes('timeout')
                )) {
                    currentRpcIndex = (currentRpcIndex + 1) % rpcEndpoints.length;
                    console.log('Switching to fallback RPC:', rpcEndpoints[currentRpcIndex]);
                    // Reinitialize Jupiter with new RPC
                    initJupiter(rpcEndpoints[currentRpcIndex]);
                }
            }
        });
    };

    // Initialize Jupiter Terminal with a slight delay to ensure DOM is ready
    setTimeout(() => {
        initJupiter(rpcEndpoints[currentRpcIndex]);
    }, 100);

    // Bottom sheet functionality
    const bottomSheet = document.querySelector('.jupiter-bottom-sheet');
    const closeButton = document.querySelector('.close-bottom-sheet');
    
    // Function to toggle bottom sheet
    function toggleBottomSheet() {
        bottomSheet.classList.toggle('active');
    }

    // Close button handler
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();  // Prevent event bubbling
        bottomSheet.classList.remove('active');
    });

    // Add click handler to Quick Trade Jupiter button (sidebar)
    const jupiterBtn = document.querySelector('.jupiter-btn');
    if (jupiterBtn) {
        jupiterBtn.addEventListener('click', toggleBottomSheet);
    }

    // Add click handler to Floating Jupiter button (mobile)
    const floatingJupiterBtn = document.querySelector('.floating-jupiter-btn');
    if (floatingJupiterBtn) {
        floatingJupiterBtn.addEventListener('click', toggleBottomSheet);
    }
});
