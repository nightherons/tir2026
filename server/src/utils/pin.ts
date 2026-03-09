/**
 * Generate a random PIN of the specified length (default 6)
 */
export function generatePin(length: number = 6): string {
  const min = Math.pow(10, length - 1)
  const max = Math.pow(10, length) - 1
  return Math.floor(min + Math.random() * (max - min + 1)).toString()
}
