/**
 * Rounds a number to a specified number of decimal places.
 * Default is 2 decimal places, suitable for currency.
 * Uses Number.EPSILON to avoid floating point math errors.
 */
export function roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Rounds a number to a specified precision.
 */
export function round(num: number, precision: number = 2): number {
    const factor = Math.pow(10, precision);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}
