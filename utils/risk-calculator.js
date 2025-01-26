import logger from './logger.js';

// Risk Score Weights
const WEIGHTS = {
    VOLATILITY: 0.3,
    CONCENTRATION: 0.25,
    CORRELATION: 0.2,
    MARKET_CAP: 0.15,
    LIQUIDITY: 0.1
};

// Risk Thresholds
const THRESHOLDS = {
    VOLATILITY: {
        LOW: 20,
        MEDIUM: 40,
        HIGH: 60
    },
    CONCENTRATION: {
        MAX_SINGLE_ASSET: 30,
        MAX_SECTOR: 40
    },
    MARKET_CAP: {
        LARGE: 10e9,
        MEDIUM: 1e9,
        SMALL: 100e6
    }
};

export const calculateRiskScore = async (assets) => {
    try {
        const scores = await Promise.all([
            calculateVolatilityScore(assets),
            calculateConcentrationScore(assets),
            calculateCorrelationScore(assets),
            calculateMarketCapScore(assets),
            calculateLiquidityScore(assets)
        ]);

        const weightedScore = scores.reduce((total, score, index) => {
            return total + (score * Object.values(WEIGHTS)[index]);
        }, 0);

        return normalizeRiskScore(weightedScore);
    } catch (error) {
        logger.error('Error calculating risk score:', error);
        throw error;
    }
};

const calculateVolatilityScore = async (assets) => {
    try {
        let volatilityScore = 0;

        for (const asset of assets) {
            const historicalVolatility = await getHistoricalVolatility(asset.symbol);
            let assetScore = 0;

            if (historicalVolatility <= THRESHOLDS.VOLATILITY.LOW) {
                assetScore = 25;
            } else if (historicalVolatility <= THRESHOLDS.VOLATILITY.MEDIUM) {
                assetScore = 50;
            } else if (historicalVolatility <= THRESHOLDS.VOLATILITY.HIGH) {
                assetScore = 75;
            } else {
                assetScore = 100;
            }
            volatilityScore += assetScore * (asset.allocation / 100);
        }

        return volatilityScore;
    } catch (error) {
        logger.error('Error calculating volatility score:', error);
        throw error;
    }
};

const calculateConcentrationScore = (assets) => {
    try {
        const maxAllocation = Math.max(...assets.map(asset => asset.allocation));
        let concentrationScore = 0;

        if (maxAllocation > THRESHOLDS.CONCENTRATION.MAX_SINGLE_ASSET) {
            concentrationScore += (maxAllocation - THRESHOLDS.CONCENTRATION.MAX_SINGLE_ASSET) * 2;
        }

        // Sector concentration
        const sectorAllocations = assets.reduce((acc, asset) => {
            acc[asset.sector] = (acc[asset.sector] || 0) + asset.allocation;
            return acc;
        }, {});

        const maxSectorAllocation = Math.max(...Object.values(sectorAllocations));
        if (maxSectorAllocation > THRESHOLDS.CONCENTRATION.MAX_SECTOR) {
            concentrationScore += (maxSectorAllocation - THRESHOLDS.CONCENTRATION.MAX_SECTOR) * 1.5;
        }

        return Math.min(concentrationScore, 100);
    } catch (error) {
        logger.error('Error calculating concentration score:', error);
        throw error;
    }
};

const calculateCorrelationScore = async (assets) => {
    try {
        if (assets.length < 2) return 0;

        const correlationMatrix = await getCorrelationMatrix(assets.map(a => a.symbol));
        let totalCorrelation = 0;
        let pairCount = 0;

        for (let i = 0; i < assets.length; i++) {
            for (let j = i + 1; j < assets.length; j++) {
                totalCorrelation += Math.abs(correlationMatrix[i][j]);
                pairCount++;
            }
        }

        const averageCorrelation = totalCorrelation / pairCount;
        return averageCorrelation * 100;
    } catch (error) {
        logger.error('Error calculating correlation score:', error);
        throw error;
    }
};

const calculateMarketCapScore = async (assets) => {
    try {
        let marketCapScore = 0;

        for (const asset of assets) {
            const marketCap = await getMarketCap(asset.symbol);
            let assetScore = 0;

            if (marketCap >= THRESHOLDS.MARKET_CAP.LARGE) {
                assetScore = 25;
            } else if (marketCap >= THRESHOLDS.MARKET_CAP.MEDIUM) {
                assetScore = 50;
            } else if (marketCap >= THRESHOLDS.MARKET_CAP.SMALL) {
                assetScore = 75;
            } else {
                assetScore = 100;
            }

            marketCapScore += assetScore * (asset.allocation / 100);
        }

        return marketCapScore;
    } catch (error) {
        logger.error('Error calculating market cap score:', error);
        throw error;
    }
};

const calculateLiquidityScore = async (assets) => {
    try {
        let liquidityScore = 0;

        for (const asset of assets) {
            const { volume24h, marketCap } = await getMarketMetrics(asset.symbol);
            const liquidityRatio = volume24h / marketCap;

            // Score based on liquidity ratio
            let assetScore = Math.min(100, (1 - liquidityRatio) * 100);
            liquidityScore += assetScore * (asset.allocation / 100);
        }

        return liquidityScore;
    } catch (error) {
        logger.error('Error calculating liquidity score:', error);
        throw error;
    }
};

const normalizeRiskScore = (score) => {
    return Math.min(Math.max(Math.round(score), 0), 100);
};

export default {
    calculateRiskScore,
    WEIGHTS,
    THRESHOLDS
};