import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

// Load environment variables
dotenv.config();

// Initialize bot with token
const bot = new Telegraf(process.env.BOT_TOKEN);

// Store subscribed users (in-memory)
const subscribedUsers = new Set();

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Parse admin IDs from environment variable
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

// Function to generate alpha insight using OpenAI
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
    // Enhanced error logging for OpenAI API
    if (error.response) {
      console.error('OpenAI API error:', error.response.status, error.response.data);
    } else {
      console.error('OpenAI API error:', error.message || error);
    }
    throw new Error('Failed to generate alpha insight.');
  }
}

// Command handlers
bot.command('start', (ctx) => {
  ctx.reply('Welcome to ChainEye Bot! 👋\n\nI can help you with:\n' +
    '• Getting alpha insights\n' +
    '• Managing your subscription\n\n' +
    'Use /help to see all available commands.');
});

bot.command('alpha', async (ctx) => {
  try {
    await ctx.reply('🔍 Generating today\'s high-signal crypto trading insight...');
    const insight = await generateAlphaInsight();
    await ctx.reply(insight);
  } catch (error) {
    await ctx.reply('❌ Sorry, I could not generate an alpha insight at this time.');
  }
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

// /broadcast command (admin only)
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

bot.command('help', (ctx) => {
  ctx.reply('Available commands:\n\n' +
    '/start - Welcome message\n' +
    '/alpha - Get current alpha insight\n' +
    '/subscribe - Subscribe to premium features\n' +
    '/broadcast - Broadcast alpha insight to all subscribers\n' +
    '/help - Show this help message');
});

bot.command('myid', (ctx) => {
  ctx.reply(`Your Telegram user ID is: ${ctx.from.id}`);
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An error occurred. Please try again later.');
});

// Start the bot
bot.launch()
  .then(() => {
    console.log('Bot started successfully!');
  })
  .catch((err) => {
    console.error('Failed to start bot:', err);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 