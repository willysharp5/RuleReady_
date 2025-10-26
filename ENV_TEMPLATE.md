# Environment Variables Template

## 🔑 API Keys You Need to Add to `.env.local`

Your `.env.local` file is missing these required API keys. Add them to make your app work properly:

```bash
# === MISSING KEYS (add these to your .env.local) ===

# Google Gemini API Key (for chat, embeddings, AI analysis)
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Firecrawl API Key (for website scraping)
# Get from: https://www.firecrawl.dev/app/api-keys
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# === OPTIONAL ADDITIONAL AI PROVIDERS ===

# OpenAI API Key (optional - for GPT models)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (optional - for Claude models)
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Azure OpenAI (optional - for enterprise)
AZURE_OPENAI_KEY=your_azure_key_here
AZURE_OPENAI_ENDPOINT=your_azure_endpoint_here
```

## 🚨 Current Issues:

1. **Hardcoded Gemini key** in `src/app/api/compliance-chat/route.ts` line 217
2. **Missing environment variables** causing fallback to hardcoded keys
3. **Security risk** - hardcoded keys should be removed

## 📋 Next Steps:

1. **Add the missing keys** to your `.env.local` file
2. **Remove hardcoded fallbacks** from the code
3. **Implement AI model management UI** for better control
4. **Centralize AI service** for consistent usage

## 🔍 Where Keys Are Currently Used:

- **GEMINI_API_KEY**: Chat system, embeddings, AI analysis, compliance parsing
- **FIRECRAWL_API_KEY**: Website scraping, crawling operations
