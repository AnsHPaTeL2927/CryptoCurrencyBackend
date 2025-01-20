// integrations/coingecko/transform.js
import { 
    CoinData, 
    MarketData, 
    TrendingData 
  } from './types.js';
  
  export const transformCoinData = {
    prices(data) {
      const transformed = {};
      for (const [coinId, values] of Object.entries(data)) {
        transformed[coinId] = {
          price: values.usd,
          change24h: values.usd_24h_change,
          marketCap: values.usd_market_cap,
          lastUpdated: values.last_updated_at
        };
      }
      return transformed;
    },
  
    details(data) {
      return {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        description: data.description.en,
        marketData: {
          currentPrice: data.market_data.current_price,
          marketCap: data.market_data.market_cap,
          totalVolume: data.market_data.total_volume,
          high24h: data.market_data.high_24h,
          low24h: data.market_data.low_24h,
          priceChange24h: data.market_data.price_change_24h,
          priceChangePercentage24h: data.market_data.price_change_percentage_24h,
          marketCapRank: data.market_data.market_cap_rank,
          totalSupply: data.market_data.total_supply,
          circulatingSupply: data.market_data.circulating_supply
        },
        communityData: data.community_data,
        developerData: data.developer_data,
        lastUpdated: data.last_updated
      };
    },
  
    trending(data) {
      return {
        coins: data.coins.map(coin => ({
          id: coin.item.id,
          name: coin.item.name,
          symbol: coin.item.symbol,
          marketCapRank: coin.item.market_cap_rank,
          thumb: coin.item.thumb,
          score: coin.item.score
        }))
      };
    }
  };
  
  export const transformMarketData = {
    chart(data) {
      return {
        prices: data.prices.map(([timestamp, price]) => ({
          timestamp,
          price: parseFloat(price.toFixed(8))
        })),
        marketCaps: data.market_caps.map(([timestamp, marketCap]) => ({
          timestamp,
          value: Math.round(marketCap)
        })),
        volumes: data.total_volumes.map(([timestamp, volume]) => ({
          timestamp,
          value: Math.round(volume)
        }))
      };
    },
  
    markets(data) {
      return data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
        totalVolume: coin.total_volume,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
        priceChange24h: coin.price_change_24h,
        priceChangePercentage24h: coin.price_change_percentage_24h,
        marketCapChange24h: coin.market_cap_change_24h,
        marketCapChangePercentage24h: coin.market_cap_change_percentage_24h,
        circulatingSupply: coin.circulating_supply,
        totalSupply: coin.total_supply,
        maxSupply: coin.max_supply,
        ath: coin.ath,
        athChangePercentage: coin.ath_change_percentage,
        athDate: coin.ath_date,
        sparklineIn7d: coin.sparkline_in_7d.price
      }));
    }
  };