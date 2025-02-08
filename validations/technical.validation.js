export const validateSymbol = async (symbol) => {
    const symbolRegex = /^[A-Za-z0-9]+$/;
    if (!symbolRegex.test(symbol)) {
        throw new ApiError(400, 'Invalid symbol format');
    }
    return symbol.toUpperCase();
};

export const validateIndicators = async (indicators) => {
    const validIndicators = ['RSI', 'MACD', 'EMA', 'SMA', 'BB'];
    
    let indicatorArray = Array.isArray(indicators) 
        ? indicators 
        : typeof indicators === 'string' 
            ? indicators.split(',') 
            : ['RSI', 'MACD', 'EMA'];

    // Validate each indicator
    indicatorArray = indicatorArray.map(ind => ind.trim().toUpperCase());
    
    const invalidIndicators = indicatorArray.filter(ind => !validIndicators.includes(ind));
    if (invalidIndicators.length > 0) {
        throw new ApiError(
            400, 
            `Invalid indicators: ${invalidIndicators.join(', ')}. Valid indicators are: ${validIndicators.join(', ')}`
        );
    }

    return indicatorArray;
};