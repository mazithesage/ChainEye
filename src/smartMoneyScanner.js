import fetch from 'node-fetch';

// Fetch tokens up 20% in the last 24h from Coingecko
export async function getTokensUp20Percent24h() {
  const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=percent_change_24h_desc&per_page=50&page=1&price_change_percentage=24h';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch tokens from Coingecko');
  const data = await res.json();
  console.log('Coingecko tokens:', data.map(t => ({ name: t.name, change: t.price_change_percentage_24h })));
  // Filter tokens up 20% in 24h
  return data.filter(token => token.price_change_percentage_24h && token.price_change_percentage_24h >= 20);
}

// Placeholder for wallet analysis (requires DEX or block explorer integration)
export async function getTopBuyersForToken(tokenId) {
  // In production, use Etherscan, BscScan, or a DEX subgraph to get top buyers
  // For now, return a placeholder
  return [
    { wallet: '0x123...abc', amount: 1000 },
    { wallet: '0x456...def', amount: 800 }
  ];
}

// Main function to find smart money alpha
export async function findSmartMoneyAlpha() {
  const tokens = await getTokensUp20Percent24h();
  const results = [];
  for (const token of tokens) {
    // Placeholder: get top buyers (in production, fetch real data)
    const buyers = await getTopBuyersForToken(token.id);
    for (const buyer of buyers) {
      results.push({
        wallet: buyer.wallet,
        amount: buyer.amount,
        token: token.name,
        tokenSymbol: token.symbol,
        priceChange: token.price_change_percentage_24h,
        price: token.current_price
      });
    }
  }
  return results;
} 