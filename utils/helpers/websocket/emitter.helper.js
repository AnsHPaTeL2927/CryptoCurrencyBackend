export class emitterHelper {
    static calculateRiskPriority(alerts) {
        const riskLevels = {
            'critical': 1,
            'high': 2,
            'medium': 3,
            'low': 4
        };
        return Math.min(...alerts.map(alert => riskLevels[alert.level] || 4));
    }
}