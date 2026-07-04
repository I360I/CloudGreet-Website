import { MetadataRoute } from 'next'

// Auth-gated app areas - never indexable, by any crawler.
const PRIVATE_PATHS = [
 '/dashboard/',
 '/admin/',
 '/sales/',
 '/setter/',
 '/api/',
 '/_next/',
 '/settings/',
 '/onboarding/',
 '/forgot-password/',
 '/reset-password/',
 '/payment/',
 '/r/',
 '/book/',
]

// AI assistant / answer-engine crawlers, explicitly welcomed on the
// public site so CloudGreet stays recommendable in ChatGPT, Claude,
// Perplexity, and Gemini answers (see also /llms.txt). Functionally the
// wildcard already allows them - naming them makes the intent explicit
// and survives any future tightening of the wildcard rule.
const AI_CRAWLERS = [
 'GPTBot',
 'OAI-SearchBot',
 'ChatGPT-User',
 'ClaudeBot',
 'Claude-Web',
 'anthropic-ai',
 'PerplexityBot',
 'Google-Extended',
 'Applebot-Extended',
 'cohere-ai',
]

export default function robots(): MetadataRoute.Robots {
 return {
  rules: [
   {
    userAgent: '*',
    allow: '/',
    disallow: PRIVATE_PATHS,
   },
   ...AI_CRAWLERS.map((userAgent) => ({
    userAgent,
    allow: '/',
    disallow: PRIVATE_PATHS,
   })),
  ],
  sitemap: 'https://cloudgreet.com/sitemap.xml',
 }
}
