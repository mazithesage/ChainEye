import dotenv from 'dotenv';
dotenv.config();
import { Telegraf } from 'telegraf';
import { OpenAI } from 'openai';
import fetch from 'node-fetch';
import { findSmartMoneyAlpha, getTopBuyersForToken } from './smartMoneyScanner.js';
import { getNewTokens } from './newTokens.js';

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

// In-memory storage (note: resets on cold start)
const subscribedUsers = new Set();

// In-memory map: userId -> last token list
const userTokenSelection = new Map();

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Middleware to check subscription for /alpha
async function requireSubscription(ctx, next) {
  const userId = ctx.from.id.toString();
  if (!subscribedUsers.has(userId)) {
    await ctx.reply('Subscribe to get daily alpha. Use /subscribe.');
    return;
  }
  return next();
}

// Generate alpha insight
async function generateAlphaInsight() {
  try {
    const prompt = 'Give me 1 high-signal crypto trading insight today, with reasoning.';
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a crypto trading expert.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 1.0
    });
    return response.choices[0]?.message?.content?.trim() || 'No insight generated.';
  } catch (error) {
    if (error.response) {
      console.error('OpenAI API error:', error.response.status, error.response.data);
    } else {
      console.error('OpenAI API error:', error.message || error);
    }
    throw new Error('Failed to generate alpha insight.');
  }
}

// Fetch top 5 gainers from CoinGecko
async function fetchTopGainers() {
  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
    const data = await res.json();
    const sorted = data.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
    const top5 = sorted.slice(0, 5);
    return top5.map((coin, i) =>
      `${i + 1}. ${coin.name} (${coin.symbol.toUpperCase()})\n   Price: $${coin.current_price.toLocaleString()}\n   24h Change: ${coin.price_change_percentage_24h?.toFixed(2)}%`
    ).join('\n\n');
  } catch (error) {
    console.error('CoinGecko API error:', error);
    return 'Failed to fetch market data.';
  }
}

// Commands
bot.command('start', (ctx) => {
  console.log('Received /start command from user:', ctx.from.id);
  ctx.reply('Welcome to ChainEye Bot! 👋\n\nI can help you with:\n' +
    '• Getting alpha insights\n' +
    '• Managing your subscription\n\n' +
    'Use /help to see all available commands.');
});

bot.command('subscribe', (ctx) => {
  const userId = ctx.from.id.toString();
  if (subscribedUsers.has(userId)) {
    ctx.reply('You are already subscribed! 🎉');
  } else {
    subscribedUsers.add(userId);
    ctx.reply('Successfully subscribed! You now have access to premium features. 🎉');
  }
});

bot.command('alpha', requireSubscription, async (ctx) => {
  try {
    await ctx.reply('🔍 Generating today\'s high-signal crypto trading insight...');
    const insight = await generateAlphaInsight();
    await ctx.reply(insight);
  } catch (error) {
    await ctx.reply('❌ Sorry, I could not generate an alpha insight at this time.');
  }
});

bot.command('broadcast', async (ctx) => {
  const userId = ctx.from.id.toString();
  if (!ADMIN_IDS.includes(userId)) {
    await ctx.reply('❌ You are not authorized to use this command.');
    return;
  }
  if (subscribedUsers.size === 0) {
    await ctx.reply('No users are currently subscribed.');
    return;
  }
  await ctx.reply('Broadcasting alpha insight to all subscribers...');
  let insight;
  try {
    insight = await generateAlphaInsight();
  } catch (error) {
    await ctx.reply('❌ Failed to generate alpha insight.');
    return;
  }
  let successCount = 0;
  for (const id of subscribedUsers) {
    try {
      await ctx.telegram.sendMessage(id, `📢 Alpha Insight Broadcast:\n\n${insight}`);
      successCount++;
    } catch (err) {
      console.error(`Failed to send to user ${id}:`, err);
    }
  }
  await ctx.reply(`Broadcast complete. Sent to ${successCount} users.`);
});

bot.command('market', async (ctx) => {
  await ctx.reply('Fetching top 5 gainers in the last 24h...');
  const result = await fetchTopGainers();
  await ctx.reply(result);
});

bot.command('smartmoney', async (ctx) => {
  await ctx.reply('Scanning for smart money wallets (this may take a few seconds)...');
  try {
    const results = await findSmartMoneyAlpha();
    if (results.length === 0) {
      await ctx.reply('No smart money wallets found at this time.');
    } else {
      const formatted = results.map(
        (w, i) => `${i + 1}. Wallet: ${w.wallet}\nToken: ${w.token}\nToken Address: ${w.tokenAddress}`
      ).join('\n\n');
      await ctx.reply(`Smart Money Wallets:\n\n${formatted}`);
    }
  } catch (err) {
    console.error('Error in /smartmoney:', err);
    await ctx.reply('Failed to scan for smart money wallets.');
  }
});

bot.command('newtokens', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const chain = args[0] || 'ethereum';
  const hours = parseInt(args[1], 10) || 6;
  await ctx.reply(`Fetching new tokens on ${chain} in the last ${hours} hours...`);
  try {
    const tokens = await getNewTokens(chain, hours);
    if (!tokens.length) {
      await ctx.reply('No new tokens found for your criteria.');
      return;
    }
    userTokenSelection.set(ctx.from.id, tokens);
    const formatted = tokens.slice(0, 10).map((t, i) =>
      `${i + 1}. ${t.name} (${t.symbol})\nPrice: $${t.priceUsd}\nLiquidity: $${t.liquidity}\n[View on GeckoTerminal](${t.url})`
    ).join('\n\n');
    await ctx.replyWithMarkdownV2(`*New Tokens on ${chain} (last ${hours}h):*\n\n${formatted}`);
  } catch (err) {
    console.error('Error in /newtokens:', err);
    await ctx.reply('Failed to fetch new tokens. Please check your chain and try again.');
  }
});

bot.command('toptraders', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const index = parseInt(args[0], 10) - 1;
  const tokens = userTokenSelection.get(ctx.from.id);
  if (!tokens || !tokens.length) {
    await ctx.reply('Please use /newtokens first to select a token.');
    return;
  }
  if (isNaN(index) || index < 0 || index >= tokens.length) {
    await ctx.reply('Please provide a valid token number from the last /newtokens list.');
    return;
  }
  const token = tokens[index];
  await ctx.reply(`Fetching top traders for ${token.name} (${token.symbol})...`);
  try {
    const traders = await getTopBuyersForToken(token.address || token.poolAddress);
    if (!traders.length) {
      await ctx.reply('No trader data available for this token (placeholder).');
      return;
    }
    const formatted = traders.map((t, i) =>
      `${i + 1}. Wallet: ${t.wallet}\nAmount: ${t.amount}`
    ).join('\n\n');
    await ctx.reply(`Top Traders for ${token.name} (${token.symbol}):\n\n${formatted}`);
  } catch (err) {
    console.error('Error in /toptraders:', err);
    await ctx.reply('Failed to fetch top traders.');
  }
});

bot.command('help', (ctx) => {
  ctx.reply('Available commands:\n\n' +
    '/start - Welcome message\n' +
    '/alpha - Get current alpha insight\n' +
    '/subscribe - Subscribe to premium features\n' +
    '/broadcast - Broadcast alpha insight to all subscribers\n' +
    '/market - Get top 5 gainers in the last 24h\n' +
    '/smartmoney - Scan for smart money wallets\n' +
    '/newtokens - Get new tokens on a specific chain and time\n' +
    '/toptraders - Get top traders for a selected token\n' +
    '/help - Show this help message');
});

bot.command('myid', (ctx) => {
  ctx.reply(`Your Telegram user ID is: ${ctx.from.id}`);
});

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An error occurred. Please try again later.');
});

export { bot, requireSubscription, generateAlphaInsight, fetchTopGainers, subscribedUsers, ADMIN_IDS }; 