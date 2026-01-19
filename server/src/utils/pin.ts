/**
 * Generate a random 6-digit PIN
 */
export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Generate a 4-digit PIN
 */
export function generate4DigitPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
