import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/admin/',
        '/api/',
        '/_next/',
        '/settings/',
        '/onboarding/',
        '/forgot-password/',
        '/reset-password/',
      ],
    },
    sitemap: 'https://cloudgreet.com/sitemap.xml',
  }
}

