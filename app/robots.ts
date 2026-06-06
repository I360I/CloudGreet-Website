import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
 return {
  rules: {
   userAgent: '*',
   allow: '/',
   disallow: [
    '/dashboard/',
    '/admin/',
    '/sales/',
    '/api/',
    '/_next/',
    '/settings/',
    '/onboarding/',
    '/forgot-password/',
    '/reset-password/',
    '/payment/',
    '/r/',
    '/book/',
   ],
  },
  sitemap: 'https://cloudgreet.com/sitemap.xml',
 }
}
