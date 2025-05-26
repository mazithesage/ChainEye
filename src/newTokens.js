import fetch from 'node-fetch';

// Fetch new tokens from Birdeye for Solana
export async function getNewTokens(hours = 6, limit = 10) {
  // Birdeye does not support filtering by hours, so we fetch the latest and filter manually
  const url = `https://public-api.birdeye.so/public/tokenlist?sort_by=created_at&sort_type=desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tokens from Birdeye');
  const data = await res.json();
  const now = Date.now();
  const msAgo = hours * 60 * 60 * 1000;
  // Filter tokens created within the timeframe
  const newTokens = (data.data || []).filter(token => {
    const createdAt = token.created_at * 1000; // Birdeye returns seconds
    return createdAt && (now - createdAt) <= msAgo;
  });
  return newTokens.map(token => ({
    name: token.name,
    symbol: token.symbol,
    address: token.address,
    createdAt: token.created_at * 1000,
    solscanUrl: `https://solscan.io/token/${token.address}`,
    birdeyeUrl: `https://birdeye.so/token/${token.address}`
  }));
} 