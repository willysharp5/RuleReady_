// Application configuration
export const APP_CONFIG = {
  // App name and branding
  name: 'RuleReady Compliance',
  shortName: 'RuleReady',
  description: 'AI-powered employment law monitoring across all US jurisdictions',
  
  // Domain configuration
  domain: 'ruleready.com',
  
  // Email configuration
  email: {
    fromName: 'RuleReady Compliance',
    fromAddress: 'noreply@ruleready.com',
    defaultRecipient: 'alerts@ruleready.com',
    placeholderEmail: 'you@company.com',
  },
  
  // URLs
  urls: {
    github: 'https://github.com/your-org/ruleready-compliance',
    documentation: '/docs',
    api: '/api-docs',
  },
  
  // Feature flags
  features: {
    aiAnalysis: true,
    webhooks: true,
    emailNotifications: true,
  },
  
  // Default values
  defaults: {
    checkInterval: 60, // minutes
    aiModel: 'gpt-4o-mini',
    aiThreshold: 70,
  },
} as const

// Helper functions
export function getFromEmail(): string {
  return `${APP_CONFIG.email.fromName} <${APP_CONFIG.email.fromAddress}>`
}

export function getAppUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  process.env.SITE_URL || 
                  'http://localhost:3000'
  return baseUrl.replace(/\/$/, '') // Remove trailing slash
}