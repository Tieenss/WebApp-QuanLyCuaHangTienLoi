/**
 * Format currency amount into Vietnamese Dong (VND) format
 * Example: 48520000 -> 48.520.000 ₫
 */
export const formatVND = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format number with Vietnamese thousand separators
 * Example: 1250 -> 1.250
 */
export const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('vi-VN').format(num);
};

/**
 * Format relative percentage change
 * Example: 12.5 -> "+12.5%"
 */
export const formatPercentage = (percent: number): string => {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
};
