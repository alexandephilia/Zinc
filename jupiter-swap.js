document.addEventListener('DOMContentLoaded', () => {
    // Initialize Jupiter Terminal with a slight delay to ensure DOM is ready
    setTimeout(() => {
        window.Jupiter.init({
            displayMode: "integrated",
            integratedTargetId: "integrated-terminal",
            endpoint: "https://mainnet.helius-rpc.com/?api-key=28ed041d-fd1f-47f3-8217-f87e8c1126a7",
            platformFeeAndAccounts: {
                feeBps: 50,
                feeAccounts: {}
            },
            defaultExplorer: "Solscan",
            containerStyles: {
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '0',
                background: 'transparent'
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
            }
        });
    }, 100);

    // Bottom sheet functionality
    const bottomSheet = document.querySelector('.jupiter-bottom-sheet');
    const closeButton = document.querySelector('.close-bottom-sheet');
    
    // Function to toggle bottom sheet
    function toggleBottomSheet() {
        bottomSheet.classList.toggle('active');
    }

    // Close button handler
    closeButton.addEventListener('click', () => {
        bottomSheet.classList.remove('active');
    });

    // Add click handler to Quick Trade Jupiter button
    const jupiterBtn = document.querySelector('.jupiter-btn');
    if (jupiterBtn) {
        jupiterBtn.addEventListener('click', toggleBottomSheet);
    }

    // Close bottom sheet when clicking outside
    document.addEventListener('click', (e) => {
        if (bottomSheet.classList.contains('active') && 
            !bottomSheet.contains(e.target) && 
            !jupiterBtn.contains(e.target)) {
            bottomSheet.classList.remove('active');
        }
    });
});
