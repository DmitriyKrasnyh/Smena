import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Смена',
    short_name: 'Смена',
    description: 'Управление задачами и командой',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f0ece4',
    theme_color: '#1a1a1a',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
