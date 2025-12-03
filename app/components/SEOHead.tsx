'use client'

import Head from 'next/head'

interface SEOHeadProps {
  title?: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: string
  author?: string
  publishedTime?: string
  modifiedTime?: string
  section?: string
  tags?: string[]
  noindex?: boolean
  canonical?: string
}

export default function SEOHead({
  title = 'CloudGreet - AI Voice Assistant for HVAC, Roofing & Painting Contractors',
  description = 'Professional AI receptionist for service contractors. Handle calls 24/7, schedule appointments, provide estimates, and never miss another opportunity. Built specifically for HVAC, roofing, and painting businesses.',
  keywords = 'AI receptionist, HVAC contractor, roofing contractor, painting contractor, voice assistant, appointment scheduling, call handling, business automation',
  image = '/og-image.jpg',
  url,
  type = 'website',
  author = 'CloudGreet Team',
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  noindex = false,
  canonical
}: SEOHeadProps) {
  const fullTitle = title.includes('CloudGreet') ? title : `${title} | CloudGreet`
  const fullUrl = url ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}${url}` : process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'
  const fullImage = image.startsWith('http') ? image : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com'}${image}`

  interface StructuredData {
    '@context': string
    '@type': string
    name: string
    description: string
    url: string
    applicationCategory: string
    operatingSystem: string
    offers: {
      '@type': string
      price: string
      priceCurrency: string
      priceValidUntil: string
    }
    aggregateRating: {
      '@type': string
      ratingValue: string
      ratingCount: string
    }
    author: {
      '@type': string
      name: string
    }
    publisher: {
      '@type': string
      name: string
      logo: {
        '@type': string
        url: string
      }
    }
    datePublished?: string
    dateModified?: string
    articleSection?: string
    keywords?: string
  }

  const structuredData: StructuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CloudGreet',
    description: description,
    url: fullUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '99',
      priceCurrency: 'USD',
      priceValidUntil: '2024-12-31'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127'
    },
    author: {
      '@type': 'Organization',
      name: author
    },
    publisher: {
      '@type': 'Organization',
      name: 'CloudGreet',
      logo: {
        '@type': 'ImageObject',
        url: `${fullUrl}/logo.png`
      }
    }
  }

  if (type === 'article' && publishedTime) {
    structuredData['@type'] = 'Article'
    structuredData.datePublished = publishedTime
    if (modifiedTime) structuredData.dateModified = modifiedTime
    if (section) structuredData.articleSection = section
    if (tags.length > 0) structuredData.keywords = tags.join(', ')
  }

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="CloudGreet" />
      <meta property="og:locale" content="en_US" />
      
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && section && (
        <meta property="article:section" content={section} />
      )}
      {type === 'article' && tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:site" content="@CloudGreet" />
      <meta name="twitter:creator" content="@CloudGreet" />

      {/* Additional SEO Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#0f172a" />
      <meta name="msapplication-TileColor" content="#0f172a" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="CloudGreet" />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />

      {/* Additional Structured Data for Business */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'CloudGreet',
            url: fullUrl,
            logo: `${fullUrl}/logo.png`,
            description: description,
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'US'
            },
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              url: `${fullUrl}/contact`
            },
            sameAs: [
              'https://twitter.com/CloudGreet',
              'https://linkedin.com/company/cloudgreet'
            ]
          })
        }}
      />

      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is CloudGreet?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'CloudGreet is an AI-powered voice assistant designed specifically for HVAC, roofing, and painting contractors to handle customer calls 24/7, schedule appointments, and provide estimates.'
                }
              },
              {
                '@type': 'Question',
                name: 'How much does CloudGreet cost?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'CloudGreet starts at $200/month for professional AI receptionist services. Get started today.'
                }
              },
              {
                '@type': 'Question',
                name: 'Does CloudGreet work with my existing phone system?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes, CloudGreet integrates with your existing phone system and can forward calls to your AI assistant or human staff as needed.'
                }
              }
            ]
          })
        }}
      />
    </Head>
  )
}
