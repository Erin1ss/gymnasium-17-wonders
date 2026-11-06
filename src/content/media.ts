export type MediaStatus = 'generated' | 'pending' | 'approved'

export type MediaItem = {
  id: string
  src: string | null
  alt: string
  status: MediaStatus
  caption?: string
  sourceDate?: string
  sourceUrl?: string
}

export const mediaCatalog: MediaItem[] = [
  {
    id: 'city-map',
    src: `${import.meta.env.BASE_URL}images/city-map.webp`,
    alt: 'Сказочный ночной город на берегу реки с мостами и тёплыми огнями',
    status: 'generated',
  },
  { id: 'class-group', src: null, alt: 'Место для согласованного общего снимка класса 9А', status: 'pending' },
  { id: 'class-project', src: null, alt: 'Место для фотографии реальной совместной работы 9А', status: 'pending' },
  { id: 'mutual-help', src: null, alt: 'Место для фотографии реальной взаимопомощи одноклассников', status: 'pending' },
  {
    id: 'kgasu-lecture',
    src: `${import.meta.env.BASE_URL}images/class/class-kgasu-lecture.webp`,
    alt: 'Ученики 8А слушают презентацию на экскурсии в КГАСУ',
    status: 'approved',
    caption: 'Знакомство с архитектурными проектами на экскурсии в КГАСУ.',
    sourceDate: '20 октября 2025',
    sourceUrl: 'https://t.me/gymnasium122/10444',
  },
  {
    id: 'kgasu-exhibit',
    src: `${import.meta.env.BASE_URL}images/class/class-kgasu-exhibit.webp`,
    alt: 'Ученики 8А рассматривают макеты и инженерные решения в КГАСУ',
    status: 'approved',
    caption: 'Макеты и инженерные решения во время экскурсии в КГАСУ.',
    sourceDate: '20 октября 2025',
    sourceUrl: 'https://t.me/gymnasium122/10444',
  },
  {
    id: 'unity-class-hour',
    src: `${import.meta.env.BASE_URL}images/class/class-unity-hour.webp`,
    alt: 'Классный час 8А, ученики смотрят презентацию в классе',
    status: 'approved',
    caption: 'Классный час ко Дню народного единства.',
    sourceDate: '7 ноября 2025',
    sourceUrl: 'https://t.me/gymnasium122/10819',
  },
  {
    id: 'theatre-visit',
    src: `${import.meta.env.BASE_URL}images/class/class-theatre-visit.webp`,
    alt: 'Сцена иммерсивного спектакля «Герои близкие и далёкие»',
    status: 'approved',
    caption: 'Спектакль «Герои близкие и далёкие», который посетил 8А.',
    sourceDate: '9 декабря 2025',
    sourceUrl: 'https://t.me/gymnasium122/11357',
  },
]
