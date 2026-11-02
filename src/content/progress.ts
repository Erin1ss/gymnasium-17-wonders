import { chapters } from './chapters'

export const STORE_KEY = 'gymnasium-17-wonders-progress-v1'
export const MOTION_KEY = 'gymnasium-17-wonders-motion-v1'

export function readProgress(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is string => chapters.some((chapter) => chapter.id === item)) : []
  } catch { return [] }
}
