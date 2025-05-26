# ChainEye Telegram Bot

A Telegram bot for ChainEye that provides alpha insights and subscription management.

## Features

- Welcome message and help command
- Alpha insights (placeholder for now)
- User subscription management
- Error handling and graceful shutdown

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your Telegram bot token:
   ```
   BOT_TOKEN=your_telegram_bot_token_here
   ```
   You can get a bot token from [@BotFather](https://t.me/BotFather) on Telegram.

## Running the Bot

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Available Commands

- `/start` - Welcome message
- `/alpha` - Get current alpha insight
- `/subscribe` - Subscribe to premium features
- `/help` - Show available commands 