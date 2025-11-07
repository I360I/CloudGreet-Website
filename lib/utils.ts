import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * cn - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await cn(param1, param2)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
