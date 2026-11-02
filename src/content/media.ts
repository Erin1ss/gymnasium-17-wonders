export type MediaStatus = 'generated' | 'pending' | 'approved'

export type MediaItem = {
  id: string
  src: string | null
  alt: string
  status: MediaStatus
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
]
