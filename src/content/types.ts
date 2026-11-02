export type ChoiceInteraction = {
  type: 'choice' | 'dialogue'
  prompt: string
  options: string[]
  answer: number
  lines?: string[]
  success: string
}

export type OrderedInteraction = {
  type: 'sequence' | 'assemble'
  prompt: string
  items: string[]
  solution: number[]
  success: string
}

export type MatchingInteraction = {
  type: 'matching'
  prompt: string
  pairs: { left: string; right: string }[]
  solution: number[]
  success: string
}

export type Interaction = ChoiceInteraction | OrderedInteraction | MatchingInteraction

export type Chapter = {
  id: string
  value: string
  place: string
  accent: string
  summary: string
  story: string
  meaning: string
  challenge: string
  interaction: Interaction
}
