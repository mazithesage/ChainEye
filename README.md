# ChainEye Telegram Bot

A Telegram bot for ChainEye that provides alpha insights, subscription management, and advanced market/trader analytics.

## Features

- Welcome message and help command
- Alpha insights (OpenAI-powered)
- User subscription management
- Market gainers
- Smart money wallet scanner
- **New tokens by chain and timeframe (GeckoTerminal integration)**
- **Top traders for selected new tokens (placeholder)**
- Error handling and graceful shutdown

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your Telegram bot token and OpenAI key:
   ```
   BOT_TOKEN=your_telegram_bot_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   ADMIN_IDS=your_telegram_user_id
   ```
   You can get a bot token from [@BotFather](https://t.me/BotFather) on Telegram.

## Running the Bot

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode (Vercel/Railway):
- Deploy using the `/api/webhook.js` endpoint for webhooks.

## Available Commands

- `/start` - Welcome message
- `/alpha` - Get current alpha insight
- `/subscribe` - Subscribe to premium features
- `/broadcast` - Broadcast alpha insight to all subscribers (admin only)
- `/market` - Get top 5 gainers in the last 24h
- `/smartmoney` - Scan for smart money wallets (tokens up 20% in 24h)
- `/newtokens <chain> <hours>` - Get new tokens on a specific chain and time (e.g., `/newtokens eth 6`)
- `/toptraders <number>` - Get top traders for a selected token from your last `/newtokens` result (e.g., `/toptraders 2`)
- `/help` - Show this help message

## Supported Chains for `/newtokens`
- `eth` (Ethereum)
- `bsc` (Binance Smart Chain)
- `polygon` (Polygon/Matic)
- `arbitrum`
- `optimism`
- `base`
- `avalanche` (AVAX)
- `fantom` (FTM)
- `solana` (SOL)

## Example Usage

- `/newtokens eth 6` — Shows new tokens on Ethereum in the last 6 hours
- `/toptraders 1` — Shows top traders for the first token in your last `/newtokens` result

## Notes
- Top traders are currently placeholder data. For real analytics, integrate with a DEX subgraph or block explorer.
- The bot uses GeckoTerminal for new token data (reliable and public).
- In-memory storage is used for user token selection (resets on restart). 