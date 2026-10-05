import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Картинки берём прямо с TMDB нужного размера, мимо Vercel Image Optimization (см. загрузчик)
    loader: 'custom',
    loaderFile: './lib/images/tmdb-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },
}

export default nextConfig