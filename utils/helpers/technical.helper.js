export class TechnicalHelper {
    static calculateRSI(prices, period = 14) {
        try {
            if (prices.length < period + 1) {
                throw new Error('Not enough data points');
            }

            // Calculate price changes
            const changes = new Array(prices.length - 1);
            for (let i = 1; i < prices.length; i++) {
                changes[i - 1] = prices[i] - prices[i - 1];
            }

            // Initialize gain/loss arrays
            let gains = new Array(changes.length).fill(0);
            let losses = new Array(changes.length).fill(0);

            // Separate gains and losses
            for (let i = 0; i < changes.length; i++) {
                if (changes[i] > 0) gains[i] = changes[i];
                else if (changes[i] < 0) losses[i] = Math.abs(changes[i]);
            }

            // Calculate initial averages
            let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
            let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

            // Calculate smoothed averages and RSI
            const rsiValues = new Array(prices.length - period);
            let rs = avgGain / avgLoss;
            rsiValues[0] = 100 - (100 / (1 + rs));

            // Wilder's smoothing
            for (let i = period; i < changes.length; i++) {
                avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
                avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
                rs = avgGain / avgLoss;
                rsiValues[i - period + 1] = 100 - (100 / (1 + rs));
            }

            return {
                values: rsiValues,
                lastValue: parseFloat(rsiValues[rsiValues.length - 1].toFixed(2))
            };
        } catch (error) {
            throw new Error(`RSI calculation error: ${error.message}`);
        }
    }

    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     * Standard settings: 12-day EMA, 26-day EMA, and 9-day EMA signal line
     */
    static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        try {
            if (prices.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
                throw new Error('Not enough data points');
            }

            // Calculate EMAs
            const fastEMA = this.calculateEMA(prices, fastPeriod);
            const slowEMA = this.calculateEMA(prices, slowPeriod);

            // Calculate MACD line
            const macdLine = new Array(prices.length - slowPeriod + 1);
            for (let i = 0; i < macdLine.length; i++) {
                macdLine[i] = fastEMA.values[i + (slowPeriod - fastPeriod)] - slowEMA.values[i];
            }

            // Calculate Signal line (9-day EMA of MACD line)
            const signalLine = this.calculateEMA(macdLine, signalPeriod).values;

            // Calculate Histogram
            const histogram = new Array(signalLine.length);
            for (let i = 0; i < histogram.length; i++) {
                histogram[i] = macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i];
            }

            return {
                macd: parseFloat(macdLine[macdLine.length - 1].toFixed(2)),
                signal: parseFloat(signalLine[signalLine.length - 1].toFixed(2)),
                histogram: parseFloat(histogram[histogram.length - 1].toFixed(2)),
                values: {
                    macdLine,
                    signalLine,
                    histogram
                }
            };
        } catch (error) {
            throw new Error(`MACD calculation error: ${error.message}`);
        }
    }

    /**
     * Calculate EMA (Exponential Moving Average)
     * More weight is given to recent prices
     */
    static calculateEMA(prices, period) {
        try {
            if (prices.length < period) {
                throw new Error('Not enough data points');
            }

            const multiplier = 2 / (period + 1);
            const emaValues = new Array(prices.length - period + 1);

            // Initialize EMA with SMA
            let sum = 0;
            for (let i = 0; i < period; i++) {
                sum += prices[i];
            }
            emaValues[0] = sum / period;

            // Calculate EMA values
            for (let i = 1; i < emaValues.length; i++) {
                emaValues[i] = (prices[i + period - 1] - emaValues[i - 1]) * multiplier + emaValues[i - 1];
            }

            return {
                values: emaValues,
                lastValue: parseFloat(emaValues[emaValues.length - 1].toFixed(2))
            };
        } catch (error) {
            throw new Error(`EMA calculation error: ${error.message}`);
        }
    }

    /**
     * Calculate Bollinger Bands
     * Standard settings: 20-period SMA with 2 standard deviations
     */
    static calculateBollingerBands(prices, period = 20, stdDev = 2) {
        try {
            if (prices.length < period) {
                throw new Error('Not enough data points');
            }

            const bands = {
                upper: new Array(prices.length - period + 1),
                middle: new Array(prices.length - period + 1),
                lower: new Array(prices.length - period + 1)
            };

            for (let i = 0; i < prices.length - period + 1; i++) {
                const slice = prices.slice(i, i + period);
                const sma = slice.reduce((sum, price) => sum + price, 0) / period;

                // Calculate Standard Deviation
                const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
                const variance = squaredDiffs.reduce((sum, sqDiff) => sum + sqDiff, 0) / period;
                const standardDeviation = Math.sqrt(variance);

                bands.middle[i] = sma;
                bands.upper[i] = sma + (standardDeviation * stdDev);
                bands.lower[i] = sma - (standardDeviation * stdDev);
            }

            return {
                upper: parseFloat(bands.upper[bands.upper.length - 1].toFixed(2)),
                middle: parseFloat(bands.middle[bands.middle.length - 1].toFixed(2)),
                lower: parseFloat(bands.lower[bands.lower.length - 1].toFixed(2)),
                values: bands
            };
        } catch (error) {
            throw new Error(`Bollinger Bands calculation error: ${error.message}`);
        }
    }

    /**
     * Get signal interpretation for RSI
     */
    static getRSISignal(value) {
        if (value >= 70) return { signal: 'overbought', strength: 'strong' };
        if (value >= 60) return { signal: 'overbought', strength: 'weak' };
        if (value <= 30) return { signal: 'oversold', strength: 'strong' };
        if (value <= 40) return { signal: 'oversold', strength: 'weak' };
        return { signal: 'neutral', strength: 'neutral' };
    }

    /**
     * Get MACD signal interpretation
     */
    static getMACDSignal(macd, signal, histogram) {
        if (macd > signal && histogram > 0) {
            return { signal: 'buy', strength: histogram > macd ? 'strong' : 'weak' };
        }
        if (macd < signal && histogram < 0) {
            return { signal: 'sell', strength: Math.abs(histogram) > Math.abs(macd) ? 'strong' : 'weak' };
        }
        return { signal: 'neutral', strength: 'neutral' };
    }

    static calculateOverallTrend(results) {
        const trends = {
            primary: 'neutral',
            strength: 'neutral',
            confirmations: 0
        };
    
        // Count bullish and bearish signals
        let bullishCount = 0;
        let bearishCount = 0;
    
        // Check RSI
        if (results.signals.RSI) {
            if (results.signals.RSI.signal === 'oversold') bullishCount++;
            if (results.signals.RSI.signal === 'overbought') bearishCount++;
            if (results.signals.RSI.strength === 'strong') {
                trends.confirmations++;
            }
        }
    
        // Check MACD
        if (results.signals.MACD) {
            if (results.signals.MACD.signal === 'buy') bullishCount++;
            if (results.signals.MACD.signal === 'sell') bearishCount++;
            if (results.signals.MACD.strength === 'strong') {
                trends.confirmations++;
            }
        }
    
        // Determine primary trend
        if (bullishCount > bearishCount) {
            trends.primary = 'bullish';
            trends.strength = trends.confirmations >= 2 ? 'strong' : 'weak';
        } else if (bearishCount > bullishCount) {
            trends.primary = 'bearish';
            trends.strength = trends.confirmations >= 2 ? 'strong' : 'weak';
        }
    
        return trends;
    }
}