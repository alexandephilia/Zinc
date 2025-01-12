class WhaleAlerts {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.lastCheckedTimestamp = new Date();
        this.isLoading = true;
        this.maxDisplayCount = 0; // Start with no alerts shown
        this.notificationSounds = {
            banner: new Audio('/media/notification.mp3'),
            update: new Audio('/media/notification.wav')
        };
        // Enable sound by default if not set
        this.soundEnabled = localStorage.getItem('whaleAlertsSoundEnabled') !== null ? 
            localStorage.getItem('whaleAlertsSoundEnabled') === 'true' : true;
        this.injectStyles();
        this.setupEventListeners();
        this.startPolling();
    }

    setupEventListeners() {
        // Toggle notification menu
        const notificationBtn = document.getElementById('notificationBtn');
        notificationBtn.addEventListener('click', () => {
            const dropdown = document.querySelector('.notification-dropdown');
            dropdown.classList.toggle('active');
            
            // When opening, show 5 alerts and mark all as read
            if (dropdown.classList.contains('active')) {
                this.maxDisplayCount = 5;
                this.notifications.forEach(n => n.unread = false);
                this.unreadCount = 0;
                this.updateNotificationBadge();
                this.renderNotifications();
            } else {
                // When closing, reset to no alerts
                this.maxDisplayCount = 0;
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-dropdown') && !e.target.closest('#notificationBtn')) {
                document.querySelector('.notification-dropdown').classList.remove('active');
                this.maxDisplayCount = 0; // Reset to no alerts when closing
            }
        });

        // View All Alerts button
        const viewAllBtn = document.querySelector('.view-all-btn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                if (this.maxDisplayCount === 5) {
                    this.maxDisplayCount = Infinity; // Show all notifications
                    viewAllBtn.textContent = 'Show Less';
                } else {
                    this.maxDisplayCount = 5; // Reset to default
                    viewAllBtn.textContent = 'View All Alerts';
                }
                this.renderNotifications();
            });
        }

        // Add sound toggle button with both sound indicators
        const soundToggleBtn = document.createElement('button');
        soundToggleBtn.className = 'sound-toggle-btn';
        soundToggleBtn.innerHTML = `
            <span class="material-icons-round">${this.soundEnabled ? 'volume_up' : 'volume_off'}</span>
        `;
        document.querySelector('.notification-header').appendChild(soundToggleBtn);

        soundToggleBtn.addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            localStorage.setItem('whaleAlertsSoundEnabled', this.soundEnabled);
            soundToggleBtn.innerHTML = `
                <span class="material-icons-round">${this.soundEnabled ? 'volume_up' : 'volume_off'}</span>
            `;
            // Play both sounds when enabled to preview them
            if (this.soundEnabled) {
                setTimeout(() => this.playNotificationSound('banner'), 0);
                setTimeout(() => this.playNotificationSound('update'), 300);
            }
        });
    }

    async fetchWhaleTransactions() {
        try {
            const response = await fetch('https://rss.app/feeds/v1.1/FXRVMXEhTDDBKLwy.json');
            
            if (!response.ok) {
                throw new Error('Failed to fetch whale alerts');
            }
            
            const data = await response.json();
            
            return data.items
                .map(item => ({
                    id: item.id,
                    text: item.title,
                    timestamp: new Date(item.date_published),
                    link: item.url
                }))
                .filter(tweet => 
                    tweet.text.includes('whale just bought') || 
                    tweet.text.includes('whale just sold')
                )
                .sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Error fetching whale transactions:', error);
            return [];
        }
    }

    addNotification(tweet) {
        const notification = {
            id: tweet.id,
            text: tweet.text,
            timestamp: tweet.timestamp,
            link: tweet.link,
            unread: true
        };
        
        // Only show banner and play sound for new notifications
        if (tweet.timestamp > this.lastCheckedTimestamp) {
            this.playNotificationSound();
            this.showBannerAlert(notification);
        }
        
        this.notifications.unshift(notification);
        this.unreadCount++;
        this.updateNotificationBadge();
        this.renderNotifications();
    }

    playNotificationSound(type = 'banner') {
        if (!this.soundEnabled) return;
        
        try {
            const sound = this.notificationSounds[type];
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(error => {
                    console.warn('Could not play notification sound:', error);
                });
            }
        } catch (error) {
            console.warn('Error playing notification sound:', error);
        }
    }

    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        const previousCount = parseInt(badge.textContent) || 0;
        badge.textContent = this.unreadCount;
        badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        
        // Play update sound if count increased
        if (this.unreadCount > previousCount) {
            this.playNotificationSound('update');
        }
    }

    renderNotifications() {
        const container = document.querySelector('.notification-items');
        
        if (this.isLoading) {
            container.innerHTML = this.createLoadingSkeletons();
            return;
        }
        
        const sortedNotifications = [...this.notifications].sort((a, b) => b.timestamp - a.timestamp);
        const displayNotifications = sortedNotifications.slice(0, this.maxDisplayCount);
        
        container.innerHTML = displayNotifications.length ? 
            displayNotifications.map(notification => this.createNotificationHTML(notification)).join('') :
            '<div class="no-notifications">No whale alerts yet</div>';

        // Update view all button text
        const viewAllBtn = document.querySelector('.view-all-btn');
        if (viewAllBtn) {
            viewAllBtn.style.display = this.notifications.length > 5 ? 'block' : 'none';
            viewAllBtn.textContent = this.maxDisplayCount === 5 ? 'View All Alerts' : 'Show Less';
        }
    }

    createNotificationHTML(notification) {
        const timeAgo = this.getTimeAgo(notification.timestamp);
        
        // Remove whale emoji and add badge style to dollar amounts
        const cleanText = notification.text.replace(/🐳/g, '').trim();
        const coloredText = cleanText.replace(
            /\$(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)/g, 
            '<span class="amount-badge">$$$1</span>'
        );
        
        return `
            <div class="notification-item ${notification.unread ? 'unread' : ''}" data-id="${notification.id}">
                <div class="transaction-info">
                    <div class="transaction-details">
                        <div class="tweet-text">
                            ${coloredText}
                        </div>
                        <div class="transaction-time">
                            <a href="${notification.link}" target="_blank" rel="noopener noreferrer">${timeAgo}</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((new Date() - timestamp) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
            }
        }
        
        return 'Just now';
    }

    async startPolling() {
        // Initial fetch
        this.isLoading = true;
        this.renderNotifications();
        
        const tweets = await this.fetchWhaleTransactions();
        this.isLoading = false;
        
        // Set initial timestamp BEFORE processing tweets
        const initialTimestamp = new Date();
        
        tweets.forEach(tweet => {
            if (!this.notifications.find(n => n.id === tweet.id)) {
                this.addNotification(tweet);
            }
        });
        
        this.lastCheckedTimestamp = initialTimestamp;

        // Poll for new transactions every 5 seconds
        setInterval(async () => {
            const currentTime = new Date();
            const newTweets = await this.fetchWhaleTransactions();
            
            newTweets.forEach(tweet => {
                if (!this.notifications.find(n => n.id === tweet.id)) {
                    // Force show banner for new tweets in this polling interval
                    const notification = {
                        id: tweet.id,
                        text: tweet.text,
                        timestamp: tweet.timestamp,
                        link: tweet.link,
                        unread: true
                    };
                    
                    this.notifications.unshift(notification);
                    this.unreadCount++;
                    this.updateNotificationBadge(); // This will play the update sound
                    this.renderNotifications();
                    
                    // Show banner and play banner sound
                    this.showBannerAlert(notification);
                    this.playNotificationSound('banner');
                }
            });
            
            this.lastCheckedTimestamp = currentTime;
        }, 5000);
    }

    createLoadingSkeletons() {
        return Array(3).fill(0).map(() => `
            <div class="notification-item skeleton">
                <div class="transaction-info">
                    <div class="transaction-details">
                        <div class="tweet-text skeleton-text">
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line" style="width: 80%"></div>
                        </div>
                        <div class="transaction-time">
                            <div class="skeleton-time"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            ${this.existingStyles}

            /* Skeleton Loading Styles */
            @keyframes shimmer {
                0% {
                    background-position: -1000px 0;
                }
                100% {
                    background-position: 1000px 0;
                }
            }

            .skeleton {
                pointer-events: none;
            }

            .skeleton-text {
                padding-bottom: 8px;
            }

            .skeleton-line {
                height: 14px;
                margin: 6px 0;
                background: linear-gradient(
                    90deg,
                    rgba(255, 255, 255, 0.1),
                    rgba(255, 255, 255, 0.2),
                    rgba(255, 255, 255, 0.1)
                );
                background-size: 1000px 100%;
                animation: shimmer 2s infinite linear;
                border-radius: 4px;
            }

            .skeleton-time {
                width: 60px;
                height: 11px;
                background: linear-gradient(
                    90deg,
                    rgba(255, 255, 255, 0.1),
                    rgba(255, 255, 255, 0.2),
                    rgba(255, 255, 255, 0.1)
                );
                background-size: 1000px 100%;
                animation: shimmer 2s infinite linear;
                border-radius: 4px;
            }

            @media (max-width: 768px) {
                .skeleton-line {
                    height: 12px;
                    margin: 4px 0;
                }
                .skeleton-time {
                    height: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    get existingStyles() {
        return `
            ${this.baseStyles}

            /* Banner Alert Styles */
            .notification-banner {
                position: fixed;
                top: 20px;
                right: -400px;
                width: 360px;
                max-width: 90vw;
                background: linear-gradient(
                    45deg,
                    rgba(18, 18, 26, 0.75),
                    rgba(41, 98, 255, 0.05)
                );
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 9999;
            }

            .notification-banner.show {
                transform: translateX(-420px);
            }

            .banner-content {
                position: relative;
                background: rgba(18, 18, 26, 0.3);
                padding: 12px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.03);
            }

            .banner-text {
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 12px;
                color: var(--text-primary);
            }

            .banner-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .banner-time {
                font-size: 12px;
                color: #666;
                text-decoration: none;
            }

            .banner-close {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: #666;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.7;
                transition: all 0.2s ease;
            }

            .banner-close:hover {
                opacity: 1;
                color: var(--danger-color);
            }

            .banner-close .material-icons-round {
                font-size: 18px;
            }

            @media (max-width: 768px) {
                .notification-banner {
                    top: 10px;
                    width: 300px;
                    padding: 12px;
                }
                .banner-text {
                    font-size: 12px;
                    margin-bottom: 10px;
                }
                .banner-time {
                    font-size: 11px;
                }
                .banner-close .material-icons-round {
                    font-size: 16px;
                }
            }
        `;
    }

    get baseStyles() {
        return `
            .sound-toggle-btn {
                background: none;
                border: none;
                padding: 8px;
                cursor: pointer;
                color: #666;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color 0.2s ease;
                margin-left: auto;
            }

            .sound-toggle-btn:hover {
                color: var(--text-primary);
            }

            .sound-toggle-btn .material-icons-round {
                font-size: 20px;
            }

            .amount-badge {
                background-color: rgba(34, 197, 94, 0.1);
                color: #22c55e;
                padding: 1px 3px;
                border-radius: 4px;
                font-weight: 500;
            }

            .notification-item {
                padding: 8px 12px;
            }

            .transaction-info {
                width: 100%;
                padding-bottom: 16px;
            }

            .transaction-details {
                position: relative;
                width: 100%;
            }

            .tweet-text {
                font-size: 14px;
                padding-bottom: 8px;
                line-height: 1.3;
                position: relative;
            }

            .tweet-text:after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                right: 0;
                height: 1px;
                background: linear-gradient(
                    to right,
                    transparent,
                    rgba(59, 130, 246, 0.1) 20%,
                    rgba(59, 130, 246, 0.3) 50%,
                    rgba(59, 130, 246, 0.1) 80%,
                    transparent
                );
            }

            .transaction-time {
                position: absolute;
                bottom: -24px;
                right: 0;
                font-size: 12px;
                color: #666;
                padding-top: 4px;
            }

            .transaction-time a {
                color: #666;
                text-decoration: none;
            }

            @media (max-width: 768px) {
                .notification-item {
                    padding: 6px 10px;
                }
                .transaction-info {
                    padding-bottom: 14px;
                }
                .tweet-text {
                    font-size: 12px;
                    padding-bottom: 6px;
                }
                .transaction-time {
                    font-size: 11px;
                    bottom: -20px;
                }
            }
        `;
    }

    showBannerAlert(notification) {
        const banner = document.createElement('div');
        banner.className = 'notification-banner';
        
        // Remove whale emoji and add badge style to dollar amounts
        const cleanText = notification.text.replace(/🐳/g, '').trim();
        const coloredText = cleanText.replace(
            /\$(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)/g, 
            '<span class="amount-badge">$$$1</span>'
        );
        
        // Format the time display
        const timeDisplay = notification.timestamp ? this.getTimeAgo(notification.timestamp) : 'Just now';
        
        banner.innerHTML = `
            <div class="banner-content">
                <div class="banner-text">${coloredText}</div>
                <div class="banner-footer">
                    <a href="${notification.link}" target="_blank" rel="noopener noreferrer" class="banner-time">
                        ${timeDisplay}
                    </a>
                    <button class="banner-close">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
            </div>
        `;
        
        // Add close button handler
        const closeBtn = banner.querySelector('.banner-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                banner.classList.remove('show');
                setTimeout(() => banner.remove(), 300);
            });
        }
        
        document.body.appendChild(banner);
        
        // Trigger animation
        setTimeout(() => banner.classList.add('show'), 100);
        
        // Auto remove banner after 5 seconds if not closed manually
        setTimeout(() => {
            if (document.body.contains(banner)) {
                banner.classList.remove('show');
                setTimeout(() => banner.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize whale alerts when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.whaleAlerts = new WhaleAlerts();
}); 

// // Test function for banner notifications
// function testWhaleBanner() {
//     const dummyNotification = {
//         id: 'test-' + Date.now(),
//         text: 'A whale just bought 500,000 BONK ($250,000) on Jupiter Exchange',
//         timestamp: new Date(),
//         link: 'https://twitter.com/whale_alert',
//         unread: true
//     };
    
//     if (window.whaleAlerts) {
//         // Show banner and play banner sound
//         window.whaleAlerts.showBannerAlert(dummyNotification);
//         window.whaleAlerts.playNotificationSound('banner');
        
//         // Update notification count and play update sound
//         window.whaleAlerts.notifications.unshift(dummyNotification);
//         window.whaleAlerts.unreadCount++;
//         window.whaleAlerts.updateNotificationBadge(); // This will play the update sound
//         window.whaleAlerts.renderNotifications();
//     } else {
//         console.error('WhaleAlerts not initialized');
//     }
// }

// // Add test button to easily trigger notifications
// document.addEventListener('DOMContentLoaded', () => {
//     const testButton = document.createElement('button');
//     testButton.textContent = 'Test Whale Alert';
//     testButton.style.position = 'fixed';
//     testButton.style.bottom = '20px';
//     testButton.style.right = '20px';
//     testButton.style.zIndex = '9999';
//     testButton.style.padding = '8px 16px';
//     testButton.style.borderRadius = '8px';
//     testButton.style.background = '#3b82f6';
//     testButton.style.color = 'white';
//     testButton.style.border = 'none';
//     testButton.style.cursor = 'pointer';
//     testButton.onclick = testWhaleBanner;
//     document.body.appendChild(testButton);
// });