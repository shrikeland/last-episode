import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    // retry once after a short delay to handle transient network errors
    await new Promise<void>(resolve => setTimeout(resolve, 100))
    return await fn()
  }
}
