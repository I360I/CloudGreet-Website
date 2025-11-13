export type IntegrationSlug =
  | 'stripe'
  | 'telnyx'
  | 'retell'
  | 'openai'
  | 'resend'
  | 'slack'
  | 'pagerduty'
  | 'apollo'
  | 'clearbit'

export type IntegrationCategory = 'billing' | 'telephony' | 'ai' | 'communications' | 'alerts' | 'acquisition'

export type ValidatorKey =
  | 'stripeSecret'
  | 'telnyxApiKey'
  | 'retellApiKey'
  | 'openaiApiKey'
  | 'resendApiKey'
  | 'slackWebhook'
  | 'pagerdutyKey'
  | 'apolloApiKey'
  | 'clearbitApiKey'
  | 'nonSecret'

export interface IntegrationFieldConfig {
  key: string
  label: string
  description: string
  placeholder?: string
  type: 'secret' | 'text'
  validator: ValidatorKey
  optional?: boolean
  mask?: boolean
  docsUrl?: string
}

export interface IntegrationConfig {
  slug: IntegrationSlug
  name: string
  description: string
  category: IntegrationCategory
  icon: string
  docsUrl?: string
  fields: IntegrationFieldConfig[]
}

export const INTEGRATIONS: IntegrationConfig[] = [
  {
    slug: 'stripe',
    name: 'Stripe',
    description: 'Process subscriptions, per-booking fees, and manage dunning automatically.',
    category: 'billing',
    icon: 'credit-card',
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      {
        key: 'stripe_secret_key',
        label: 'Secret key',
        description: 'Used server-side to create subscriptions and invoices.',
        placeholder: 'sk_live_...',
        type: 'secret',
        validator: 'stripeSecret',
        mask: true
      },
      {
        key: 'stripe_publishable_key',
        label: 'Publishable key (optional)',
        description: 'Needed if you expose Stripe Elements or the customer portal in the client.',
        placeholder: 'pk_live_...',
        type: 'text',
        validator: 'nonSecret',
        optional: true,
        mask: true
      }
    ]
  },
  {
    slug: 'telnyx',
    name: 'Telnyx',
    description: 'Provision phone numbers, send SMS, and drive inbound/outbound call flows.',
    category: 'telephony',
    icon: 'phone-forwarded',
    docsUrl: 'https://portal.telnyx.com/',
    fields: [
      {
        key: 'telnyx_api_key',
        label: 'API key',
        description: 'Required for number provisioning and messaging.',
        placeholder: 'KEYXXXXXXXXXXXX',
        type: 'secret',
        validator: 'telnyxApiKey',
        mask: true
      },
      {
        key: 'telnyx_messaging_profile_id',
        label: 'Messaging profile ID',
        description: 'Routes SMS traffic through the correct profile.',
        placeholder: '89d79bb5-....',
        type: 'text',
        validator: 'nonSecret',
        mask: true
      },
      {
        key: 'telnyx_connection_id',
        label: 'Inbound connection ID (optional)',
        description: 'Required if you use a specific SIP connection for voice.',
        placeholder: '8b040c89-....',
        type: 'text',
        validator: 'nonSecret',
        optional: true,
        mask: true
      }
    ]
  },
  {
    slug: 'retell',
    name: 'Retell AI',
    description: 'Generate AI receptionists for inbound and outbound call flows.',
    category: 'ai',
    icon: 'bot',
    docsUrl: 'https://dashboard.retell.ai/',
    fields: [
      {
        key: 'retell_api_key',
        label: 'API key',
        description: 'Required to create and update phone agents.',
        placeholder: 'retell-live-...',
        type: 'secret',
        validator: 'retellApiKey',
        mask: true
      },
      {
        key: 'retell_webhook_secret',
        label: 'Webhook secret',
        description: 'Verifies voice webhook callbacks.',
        placeholder: 'whsec_...',
        type: 'secret',
        validator: 'nonSecret',
        mask: true
      }
    ]
  },
  {
    slug: 'openai',
    name: 'OpenAI',
    description: 'Back up LLM responses and provide AI summarisation.',
    category: 'ai',
    icon: 'sparkles',
    docsUrl: 'https://platform.openai.com/account/api-keys',
    fields: [
      {
        key: 'openai_api_key',
        label: 'API key',
        description: 'Used for GPT-based enrichment and fallbacks.',
        placeholder: 'sk-...',
        type: 'secret',
        validator: 'openaiApiKey',
        mask: true
      }
    ]
  },
  {
    slug: 'resend',
    name: 'Resend',
    description: 'Send onboarding, follow-up, and alert emails.',
    category: 'communications',
    icon: 'mail',
    docsUrl: 'https://resend.com/api-keys',
    fields: [
      {
        key: 'resend_api_key',
        label: 'API key',
        description: 'Authorises transactional email delivery.',
        placeholder: 're_123456789',
        type: 'secret',
        validator: 'resendApiKey',
        mask: true
      }
    ]
  },
  {
    slug: 'slack',
    name: 'Slack',
    description: 'Receive monitor alerts and sales notifications in Slack.',
    category: 'alerts',
    icon: 'slack',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    fields: [
      {
        key: 'slack_webhook_url',
        label: 'Incoming webhook URL',
        description: 'Messages are posted here when synthetic monitors fail.',
        placeholder: 'https://hooks.slack.com/services/...',
        type: 'text',
        validator: 'slackWebhook',
        mask: true
      }
    ]
  },
  {
    slug: 'pagerduty',
    name: 'PagerDuty',
    description: 'Escalate incidents after repeated synthetic monitor failures.',
    category: 'alerts',
    icon: 'bell-ring',
    docsUrl: 'https://support.pagerduty.com/docs/routing-keys',
    fields: [
      {
        key: 'pagerduty_routing_key',
        label: 'Events API v2 routing key',
        description: 'Sends high-priority incidents directly to on-call responders.',
        placeholder: '0123456789abcdef0123456789abcdef',
        type: 'secret',
        validator: 'pagerdutyKey',
        mask: true
      }
    ]
  },
  {
    slug: 'apollo',
    name: 'Apollo.io',
    description: 'Enrich the prospect database and automate outbound sequences.',
    category: 'acquisition',
    icon: 'target',
    docsUrl: 'https://docs.apollo.io/reference/api-key-authentication',
    fields: [
      {
        key: 'apollo_api_key',
        label: 'API key',
        description: 'Authorises nightly prospect imports.',
        placeholder: 'apollo-prod-...',
        type: 'secret',
        validator: 'apolloApiKey',
        mask: true
      }
    ]
  },
  {
    slug: 'clearbit',
    name: 'Clearbit',
    description: 'Optional enrichment provider for company and contact intelligence.',
    category: 'acquisition',
    icon: 'database',
    docsUrl: 'https://dashboard.clearbit.com/api',
    fields: [
      {
        key: 'clearbit_api_key',
        label: 'API key',
        description: 'Used when Apollo is unavailable or to supplement enrichment.',
        placeholder: 'sk_abcdef...',
        type: 'secret',
        validator: 'clearbitApiKey',
        optional: true,
        mask: true
      }
    ]
  }
]

export const INTEGRATION_MAP: Record<IntegrationSlug, IntegrationConfig> = INTEGRATIONS.reduce(
  (acc, integration) => {
    acc[integration.slug] = integration
    return acc
  },
  {} as Record<IntegrationSlug, IntegrationConfig>
)


