import dotenv from 'dotenv';
dotenv.config();
// This file is now unused. Deploy to Vercel and use api/webhook.js for the Telegram bot webhook endpoint.
console.log('This bot is now designed for Vercel deployment. Please use api/webhook.js as your entry point.');

import express from 'express';
import bodyParser from 'body-parser';
import { bot } from './bot.js';

const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).end();
  } catch (err) {
    console.error('Error handling update:', err);
    res.status(500).end();
  }
});

app.get('/', (req, res) => {
  res.send('ChainEye Bot is running locally.');
});

app.listen(PORT, () => {
  console.log(`Local server running on port ${PORT}`);
  console.log(`POST updates to http://localhost:${PORT}/webhook`);
}); 