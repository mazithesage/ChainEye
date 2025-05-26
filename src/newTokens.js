import fetch from 'node-fetch';

// Supported networks mapping for GeckoTerminal
const NETWORK_MAP = {
  ethereum: 'eth',
  eth: 'eth',
  bsc: 'bsc',
  binance: 'bsc',
  polygon: 'polygon',
  matic: 'polygon',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  base: 'base',
  avalanche: 'avalanche',
  avax: 'avalanche',
  fantom: 'fantom',
  ftm: 'fantom',
  solana: 'solana',
  sol: 'solana',
  // Add more as needed
};

// Fetch new tokens for a network within the last X hours
export async function getNewTokens(chain, hours = 6) {
  const networkKey = NETWORK_MAP[chain.toLowerCase()];
  if (!networkKey) throw new Error('Unsupported chain');
  const url = `https://api.geckoterminal.com/api/v2/networks/${networkKey}/pools/newest`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch pools from GeckoTerminal');
  const data = await res.json();
  const now = Date.now();
  const msAgo = hours * 60 * 60 * 1000;
  // Filter pools created within the timeframe
  const newTokens = (data.data || []).filter(pool => {
    const createdAt = pool.attributes?.created_at_ms;
    return createdAt && (now - createdAt) <= msAgo;
  });
  return newTokens.map(pool => ({
    name: pool.attributes?.base_token?.name,
    symbol: pool.attributes?.base_token?.symbol,
    address: pool.attributes?.base_token?.address,
    poolAddress: pool.id,
    createdAt: pool.attributes?.created_at_ms,
    url: `https://www.geckoterminal.com/${networkKey}/pools/${pool.id}`,
    priceUsd: pool.attributes?.base_token_price_usd,
    liquidity: pool.attributes?.reserve_in_usd,
    chain: networkKey
  }));
} 