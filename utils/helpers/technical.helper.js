import logger from "../logger.js";
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

    static calculatePerformanceMetrics(priceData) {
        try {
            const currentPrice = priceData[priceData.length - 1].close;
            const dailyOpen = priceData[priceData.length - 2].close;
            const weeklyOpen = priceData[priceData.length - 8].close;
            const monthlyOpen = priceData[priceData.length - 31].close;

            return {
                daily: {
                    change: parseFloat((currentPrice - dailyOpen).toFixed(2)),
                    changePercent: parseFloat(((currentPrice - dailyOpen) / dailyOpen * 100).toFixed(2)),
                    high: parseFloat(Math.max(...priceData.slice(-2).map(d => d.high)).toFixed(2)),
                    low: parseFloat(Math.min(...priceData.slice(-2).map(d => d.low)).toFixed(2)),
                    volume: parseFloat(priceData[priceData.length - 1].volumeTo.toFixed(2))
                },
                weekly: {
                    change: parseFloat((currentPrice - weeklyOpen).toFixed(2)),
                    changePercent: parseFloat(((currentPrice - weeklyOpen) / weeklyOpen * 100).toFixed(2)),
                    high: parseFloat(Math.max(...priceData.slice(-8).map(d => d.high)).toFixed(2)),
                    low: parseFloat(Math.min(...priceData.slice(-8).map(d => d.low)).toFixed(2)),
                    volume: parseFloat(priceData.slice(-8).reduce((sum, d) => sum + d.volumeTo, 0).toFixed(2))
                },
                monthly: {
                    change: parseFloat((currentPrice - monthlyOpen).toFixed(2)),
                    changePercent: parseFloat(((currentPrice - monthlyOpen) / monthlyOpen * 100).toFixed(2)),
                    high: parseFloat(Math.max(...priceData.slice(-31).map(d => d.high)).toFixed(2)),
                    low: parseFloat(Math.min(...priceData.slice(-31).map(d => d.low)).toFixed(2)),
                    volume: parseFloat(priceData.slice(-31).reduce((sum, d) => sum + d.volumeTo, 0).toFixed(2))
                }
            };
        } catch (error) {
            logger.error('Error calculating performance metrics:', error);
            return null;
        }
    }

    static calculateVolatilityMetrics(priceData) {
        try {
            const prices = priceData.map(d => d.close);
            const returns = [];

            for (let i = 1; i < prices.length; i++) {
                returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
            }

            const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
            const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
            const stdDev = Math.sqrt(variance);
            const annualizedVol = stdDev * Math.sqrt(365) * 100;

            return {
                daily: parseFloat(stdDev.toFixed(4)),
                annualized: parseFloat(annualizedVol.toFixed(2)),
                classification: this.getVolatilityClassification(annualizedVol),
                metrics: {
                    meanReturn: parseFloat(mean.toFixed(4)),
                    maxDrawdown: this.calculateMaxDrawdown(prices),
                    sharpeRatio: this.calculateSharpeRatio(returns, mean, stdDev)
                }
            };
        } catch (error) {
            logger.error('Error calculating volatility metrics:', error);
            return null;
        }
    }

    // Additional helper methods...
    static getVolatilityClassification(annualizedVol) {
        if (annualizedVol <= 15) return 'low';
        if (annualizedVol <= 35) return 'moderate';
        if (annualizedVol <= 60) return 'high';
        return 'very_high';
    }

    static calculateMaxDrawdown(prices) {
        let maxDrawdown = 0;
        let peak = prices[0];

        for (const price of prices) {
            if (price > peak) peak = price;
            const drawdown = (peak - price) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }

        return parseFloat((maxDrawdown * 100).toFixed(2));
    }

    static calculateSharpeRatio(returns, mean, stdDev) {
        const riskFreeRate = 0.02 / 365; // Assuming 2% annual risk-free rate
        return parseFloat(((mean - riskFreeRate) / stdDev * Math.sqrt(365)).toFixed(2));
    }

    static calculateSupportResistance(priceData) {
        try {
            const prices = priceData.map(d => ({
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volumeTo
            }));

            const currentPrice = prices[prices.length - 1].close;

            // 1. Calculate using multiple methods and combine results
            const pivotPoints = this.calculatePivotPoints(prices);
            const volumeProfile = this.calculateVolumeProfile(prices);
            const fractals = this.calculateFractalLevels(prices);
            const swingLevels = this.calculateSwingLevels(prices);

            // 2. Combine and weight all levels
            const allLevels = this.combineAndWeightLevels([
                { levels: pivotPoints, weight: 0.3 },
                { levels: volumeProfile, weight: 0.25 },
                { levels: fractals, weight: 0.25 },
                { levels: swingLevels, weight: 0.2 }
            ], currentPrice);

            // 3. Separate and sort support/resistance levels
            const supports = allLevels.filter(level =>
                level.price < currentPrice * 0.9999
            ).sort((a, b) => b.price - a.price);

            const resistances = allLevels.filter(level =>
                level.price > currentPrice * 1.0001
            ).sort((a, b) => a.price - b.price);

            return {
                support: {
                    levels: supports.slice(0, 3).map(s => ({
                        price: parseFloat(s.price.toFixed(2)),
                        strength: s.strength,
                        confidence: this.calculateConfidence(s)
                    })),
                    strength: this.calculateOverallStrength(supports)
                },
                resistance: {
                    levels: resistances.slice(0, 3).map(r => ({
                        price: parseFloat(r.price.toFixed(2)),
                        strength: r.strength,
                        confidence: this.calculateConfidence(r)
                    })),
                    strength: this.calculateOverallStrength(resistances)
                },
                current_position: {
                    price: parseFloat(currentPrice.toFixed(2)),
                    nearest_support: supports[0] ? parseFloat(supports[0].price.toFixed(2)) : null,
                    nearest_resistance: resistances[0] ? parseFloat(resistances[0].price.toFixed(2)) : null,
                    zone: this.determineCurrentZone(currentPrice, supports[0]?.price, resistances[0]?.price)
                }
            };
        } catch (error) {
            logger.error('Error in calculateSupportResistance:', error);
            return null;
        }
    }

    static calculatePivotPoints(prices) {
        const levels = [];
        const lastCandle = prices[prices.length - 1];

        // Calculate classic pivot points
        const pp = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
        const r1 = 2 * pp - lastCandle.low;
        const s1 = 2 * pp - lastCandle.high;
        const r2 = pp + (lastCandle.high - lastCandle.low);
        const s2 = pp - (lastCandle.high - lastCandle.low);

        return [
            { price: s2, type: 'S2', method: 'pivot' },
            { price: s1, type: 'S1', method: 'pivot' },
            { price: pp, type: 'PP', method: 'pivot' },
            { price: r1, type: 'R1', method: 'pivot' },
            { price: r2, type: 'R2', method: 'pivot' }
        ];
    }

    static calculateVolumeProfile(prices) {
        const volumeByPrice = new Map();
        const priceIncrement = 1; // Adjust based on asset price

        prices.forEach(candle => {
            const volumePerPrice = candle.volume / (candle.high - candle.low);

            for (let price = candle.low; price <= candle.high; price += priceIncrement) {
                const roundedPrice = Math.round(price / priceIncrement) * priceIncrement;
                volumeByPrice.set(roundedPrice,
                    (volumeByPrice.get(roundedPrice) || 0) + volumePerPrice);
            }
        });

        // Find high volume nodes
        const levels = [];
        let maxVolume = Math.max(...volumeByPrice.values());
        const volumeThreshold = maxVolume * 0.7; // 70% of max volume

        volumeByPrice.forEach((volume, price) => {
            if (volume >= volumeThreshold) {
                levels.push({
                    price,
                    strength: volume / maxVolume,
                    method: 'volume'
                });
            }
        });

        return levels;
    }

    static calculateFractalLevels(prices) {
        const levels = [];
        const window = 5; // Fractal window size

        for (let i = 2; i < prices.length - 2; i++) {
            // Bullish fractal (support)
            if (prices[i].low < prices[i - 2].low &&
                prices[i].low < prices[i - 1].low &&
                prices[i].low < prices[i + 1].low &&
                prices[i].low < prices[i + 2].low) {
                levels.push({
                    price: prices[i].low,
                    type: 'support',
                    method: 'fractal'
                });
            }

            // Bearish fractal (resistance)
            if (prices[i].high > prices[i - 2].high &&
                prices[i].high > prices[i - 1].high &&
                prices[i].high > prices[i + 1].high &&
                prices[i].high > prices[i + 2].high) {
                levels.push({
                    price: prices[i].high,
                    type: 'resistance',
                    method: 'fractal'
                });
            }
        }

        return levels;
    }

    static calculateSwingLevels(prices) {
        const levels = [];
        const swingSize = 3; // Minimum number of candles for swing

        for (let i = swingSize; i < prices.length - swingSize; i++) {
            // Check for swing low (support)
            let isSwingLow = true;
            for (let j = 1; j <= swingSize; j++) {
                if (prices[i].low >= prices[i - j].low || prices[i].low >= prices[i + j].low) {
                    isSwingLow = false;
                    break;
                }
            }
            if (isSwingLow) {
                levels.push({
                    price: prices[i].low,
                    type: 'support',
                    method: 'swing'
                });
            }

            // Check for swing high (resistance)
            let isSwingHigh = true;
            for (let j = 1; j <= swingSize; j++) {
                if (prices[i].high <= prices[i - j].high || prices[i].high <= prices[i + j].high) {
                    isSwingHigh = false;
                    break;
                }
            }
            if (isSwingHigh) {
                levels.push({
                    price: prices[i].high,
                    type: 'resistance',
                    method: 'swing'
                });
            }
        }

        return levels;
    }

    static combineAndWeightLevels(methodLevels, currentPrice) {
        const combinedLevels = new Map();
        const priceThreshold = currentPrice * 0.001; // 0.1% threshold for grouping

        methodLevels.forEach(({ levels, weight }) => {
            levels.forEach(level => {
                let found = false;
                for (const [key, value] of combinedLevels.entries()) {
                    if (Math.abs(key - level.price) <= priceThreshold) {
                        // Normalize strength to 0-1 range
                        const levelStrength = Math.min(level.strength || 0.5, 1);
                        value.strength = Math.min(value.strength + (weight * levelStrength), 1);
                        value.confirmations++;
                        value.methods.push(level.method);
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    combinedLevels.set(level.price, {
                        price: level.price,
                        strength: Math.min(weight * (level.strength || 0.5), 1),
                        confirmations: 1,
                        methods: [level.method]
                    });
                }
            });
        });

        return Array.from(combinedLevels.values())
            .map(level => ({
                ...level,
                confidence: this.calculateConfidence(level)
            }))
            .sort((a, b) => b.strength - a.strength);
    }

    static calculateConfidence(level) {
        // Calculate confidence based on multiple factors
        const methodWeight = Math.min(level.methods.length / 4, 1); // Max 4 methods, normalized to 0-1
        const strengthWeight = Math.min(level.strength || 0, 1); // Ensure 0-1 range
        const confirmationWeight = Math.min(level.confirmations / 3, 1); // Cap at 3 confirmations

        // Calculate weighted confidence (0-100%)
        const confidence = (
            (methodWeight * 0.4 +
                strengthWeight * 0.4 +
                confirmationWeight * 0.2) * 100
        );

        // Ensure result is between 0-100 and has 2 decimal places
        return parseFloat(Math.min(Math.max(confidence, 0), 100).toFixed(2));
    }

    static calculateOverallStrength(levels) {
        if (levels.length === 0) return 'unknown';

        const avgConfidence = levels.reduce((sum, level) => sum + level.confidence, 0) / levels.length;

        if (avgConfidence >= 80) return 'very_strong';
        if (avgConfidence >= 60) return 'strong';
        if (avgConfidence >= 40) return 'moderate';
        if (avgConfidence >= 20) return 'weak';
        return 'very_weak';
    }

    static determineCurrentZone(currentPrice, nearestSupport, nearestResistance) {
        try {
            // Validate inputs
            if (!currentPrice || !nearestSupport || !nearestResistance) {
                return {
                    zone: 'unknown',
                    position: null,
                    strength: null
                };
            }
    
            // Validate price range
            if (nearestResistance <= nearestSupport) {
                return {
                    zone: 'invalid',
                    position: null,
                    strength: null,
                    error: 'Invalid support/resistance levels'
                };
            }
    
            // Check if price is outside the range
            if (currentPrice < nearestSupport) {
                return {
                    zone: 'below_support',
                    position: Math.abs((currentPrice - nearestSupport) / nearestSupport * 100).toFixed(2) + '%',
                    strength: 'breakdown'
                };
            }
    
            if (currentPrice > nearestResistance) {
                return {
                    zone: 'above_resistance',
                    position: Math.abs((currentPrice - nearestResistance) / nearestResistance * 100).toFixed(2) + '%',
                    strength: 'breakout'
                };
            }
    
            // Calculate position within range
            const range = nearestResistance - nearestSupport;
            const distanceFromSupport = currentPrice - nearestSupport;
            const relativePosition = (distanceFromSupport / range) * 100;
    
            // Determine zone and strength
            let zone, strength;
    
            if (Math.abs(currentPrice - nearestSupport) < (range * 0.01)) {
                return {
                    zone: 'at_support',
                    position: '0%',
                    strength: 'exact'
                };
            }
    
            if (Math.abs(currentPrice - nearestResistance) < (range * 0.01)) {
                return {
                    zone: 'at_resistance',
                    position: '100%',
                    strength: 'exact'
                };
            }
    
            // Define zones with more precision
            if (relativePosition <= 20) {
                zone = 'support';
                strength = 'strong';
            } else if (relativePosition <= 40) {
                zone = 'support';
                strength = 'weak';
            } else if (relativePosition <= 60) {
                zone = 'neutral';
                strength = 'neutral';
            } else if (relativePosition <= 80) {
                zone = 'resistance';
                strength = 'weak';
            } else {
                zone = 'resistance';
                strength = 'strong';
            }
    
            return {
                zone,
                position: relativePosition.toFixed(2) + '%',
                strength,
                details: {
                    distanceToSupport: parseFloat((currentPrice - nearestSupport).toFixed(2)),
                    distanceToResistance: parseFloat((nearestResistance - currentPrice).toFixed(2)),
                    rangeSize: parseFloat(range.toFixed(2))
                }
            };
    
        } catch (error) {
            logger.error('Error in determineCurrentZone:', error);
            return {
                zone: 'error',
                position: null,
                strength: null,
                error: error.message
            };
        }
    }
}