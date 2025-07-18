# Zinc Trading Interface

```
########\  ######## \ ########\   ######\  ########\ ########\
##  __##\ ##  _____|    ##  __|  ##  __##\ ##  __##\ ##   __##|
## |  ## |## |          ## |     ## /  ## |## |  ## |## |  ## |
########  |######\      ## |     ########  |######## ## |  ## |
##  __##< ##  __|       ## |     ##  __##< ##  __##< ## |  ## |
## |  ## |## |          ## |     ## |  ## |## |  ## |## |  ## |
## |  ## |########\     ## |     ## |  ## |## |  ## |########  |
\__|  \__|\________|    \__|     \__|  \__|\__|  \__|\________/

#######\  ######## \  ######\  ######## \##\   ##\ 
##  __##\ ##  _____|##  __##\ ##  _____|###\  ## |
## |  ## |## |      ## /  \__|## |      ####\ ## |
## |  ## |######\   ## |      ######\   ## ##\## |
## |  ## |##  __|   ## |  ##\ ##  __|   ## \#### |
## |  ## |## |      ## \__## |## |      ## |\### |
#######  |########\ \######  |########\ ## | \## |
\_______/ \________| \______/ \________|\__|  \__|
```

A modern, responsive trading interface for Solana with integrated DexScreener data, wallet tracking, and Jupiter integration.

## Features

### 🎯 Core Features
- Real-time market data from DexScreener
- Integrated Jupiter swap functionality
- Wallet tracking with token holdings
- Dynamic watchlist management
- Mobile-responsive design

### 💼 Wallet Features
- Multi-wallet tracking
- Real-time token balance updates
- SOL and SPL token support
- Copy-to-clipboard functionality
- Custom wallet naming

### 📊 Trading Features
- Real-time price updates
- Market pair filtering
- Customizable watchlist
- Price change indicators
- Quick trade functionality

## Technical Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Blockchain**: Solana Web3.js
- **Data Provider**: DexScreener API
- **DEX Integration**: Jupiter Protocol
- **RPC Provider**: Helius

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/zinc.git
cd zinc
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file with:
```env
HELIUS_API_KEY=your_helius_api_key
```

4. Start the development server:
```bash
npm start
```

## Project Structure

```
zinc/
├── index.html
├── styles/
│   ├── styles.css
│   ├── styles2.css
│   └── styles3.css
├── js/
│   ├── script.js
│   ├── wallet-tracker.js
│   ├── jupiter-swap.js
│   ├── dexscreener.js
│   └── watchlist.js
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Jupiter Protocol](https://jup.ag)
- [DexScreener](https://dexscreener.com)
- [Helius](https://helius.xyz)
- [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
