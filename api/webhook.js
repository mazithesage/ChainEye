import { Telegraf } from 'telegraf';
import { OpenAI } from 'openai';
import fetch from 'node-fetch';
import { bot } from '../src/bot.js';

// Environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

// In-memory storage (note: resets on cold start)
const subscribedUsers = new Set();

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Bot Logic ---

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

bot.command('help', (ctx) => {
  ctx.reply('Available commands:\n\n' +
    '/start - Welcome message\n' +
    '/alpha - Get current alpha insight\n' +
    '/subscribe - Subscribe to premium features\n' +
    '/broadcast - Broadcast alpha insight to all subscribers\n' +
    '/market - Get top 5 gainers in the last 24h\n' +
    '/help - Show this help message');
});

bot.command('myid', (ctx) => {
  ctx.reply(`Your Telegram user ID is: ${ctx.from.id}`);
});

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An error occurred. Please try again later.');
});

// --- Vercel Handler ---
export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).end();
    } catch (err) {
      console.error('Error handling update:', err);
      res.status(500).end();
    }
  } else {
    res.status(200).send('OK');
  }
} 