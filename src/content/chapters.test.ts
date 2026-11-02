import { describe, expect, it } from 'vitest'
import { chapters } from './chapters'
import { isCorrectInteraction } from './validation'

const officialValues = [
  'Жизнь', 'Достоинство', 'Права и свободы человека', 'Патриотизм', 'Гражданственность',
  'Служение Отечеству и ответственность за его судьбу', 'Высокие нравственные идеалы',
  'Крепкая семья', 'Созидательный труд', 'Приоритет духовного над материальным', 'Гуманизм',
  'Милосердие', 'Справедливость', 'Коллективизм', 'Взаимопомощь и взаимоуважение',
  'Историческая память и преемственность поколений', 'Единство народов России',
]

describe('содержание сказки', () => {
  it('содержит 17 ценностей в требуемом порядке', () => {
    expect(chapters.map((chapter) => chapter.value)).toEqual(officialValues)
    expect(new Set(chapters.map((chapter) => chapter.id)).size).toBe(17)
  })

  it('даёт каждой главе законченную историю и решаемое задание', () => {
    expect(chapters).toHaveLength(17)
    for (const chapter of chapters) {
      const words = chapter.story.trim().split(/\s+/u).length
      expect(words, chapter.value).toBeGreaterThanOrEqual(150)
      expect(words, chapter.value).toBeLessThanOrEqual(300)
      expect(chapter.place, chapter.value).toBeTruthy()
      expect(chapter.meaning, chapter.value).toBeTruthy()
      expect(chapter.interaction.prompt, chapter.value).toBeTruthy()
      expect(chapter.interaction.success, chapter.value).toBeTruthy()
      if ('answer' in chapter.interaction) {
        expect(chapter.interaction.options.length, chapter.value).toBeGreaterThanOrEqual(3)
        expect(isCorrectInteraction(chapter.interaction, chapter.interaction.answer), chapter.value).toBe(true)
      } else {
        expect(isCorrectInteraction(chapter.interaction, chapter.interaction.solution), chapter.value).toBe(true)
      }
    }
  })
})
