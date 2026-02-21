import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ExportFlow',
    short_name: 'ExportFlow',
    description: 'Order management for exporters',
    start_url: '/en',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0071e3',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png'
      }
    ]
  };
}

