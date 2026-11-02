import type { Interaction } from './types'

export function isCorrectInteraction(interaction: Interaction, response: number | number[]): boolean {
  if ('answer' in interaction) {
    return typeof response === 'number' && response === interaction.answer
  }
  if (!('solution' in interaction)) return false
  return Array.isArray(response)
    && response.length === interaction.solution.length
    && response.every((value, index) => value === interaction.solution[index])
}
