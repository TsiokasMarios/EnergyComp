import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Section headings share one style so the trend and the tariff list read as peers */
export const sectionTitle = 'flair-soft text-[28px] leading-tight font-bold tracking-[-0.015em] text-balance'
