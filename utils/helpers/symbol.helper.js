export class SymbolHelper {
    // Map of CoinCap IDs to trading symbols
    static symbolMap = {
        'bitcoin': 'BTC',
        'ethereum': 'ETH',
        'binancecoin': 'BNB',
        'ripple': 'XRP',
        'cardano': 'ADA',
        'solana': 'SOL',
        'polkadot': 'DOT',
        'dogecoin': 'DOGE',
        'avalanche-2': 'AVAX',
        'matic-network': 'MATIC',
        // Add more mappings as needed
    };

    // Get CoinCap ID from trading symbol
    static getCoinCapId(symbol) {
        symbol = symbol.toUpperCase();
        return Object.entries(this.symbolMap)
            .find(([key, value]) => value === symbol)?.[0] || symbol.toLowerCase();
    }

    // Get trading symbol from CoinCap ID
    static getTradingSymbol(coinCapId) {
        return this.symbolMap[coinCapId] || coinCapId.toUpperCase();
    }

    // Convert array of trading symbols to CoinCap IDs
    static convertToCoinCapIds(symbols) {
        return symbols.map(symbol => this.getCoinCapId(symbol));
    }

    // Convert array of CoinCap IDs to trading symbols
    static convertToTradingSymbols(coinCapIds) {
        return coinCapIds.map(id => this.getTradingSymbol(id));
    }

    // Check if symbol exists in mapping
    static isValidSymbol(symbol) {
        const upperSymbol = symbol.toUpperCase();
        return Object.values(this.symbolMap).includes(upperSymbol);
    }

    // Get all supported symbols
    static getSupportedSymbols() {
        return Object.entries(this.symbolMap).map(([coinCapId, symbol]) => ({
            coinCapId,
            symbol,
            name: coinCapId.charAt(0).toUpperCase() + coinCapId.slice(1).replace(/-/g, ' ')
        }));
    }
}

export default SymbolHelper;