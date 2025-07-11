# Firecrawl Observer

Monitor websites for changes using Firecrawl. Get notified when content updates.

Built with Next.js, Convex, and Firecrawl API. Track website changes with customizable intervals, view visual diffs, and export content as markdown.

## Setup

1. Clone and install:
```bash
git clone https://github.com/mendableai/firecrawl-observer.git
cd firecrawl-observer
pnpm install
```

2. Set up Convex (follow the prompts):
```bash
npx convex dev
```

3. Create `.env.local`:
```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

4. Add your Firecrawl API key to Convex:
```bash
npx convex env set FIRECRAWL_API_KEY your_api_key_here
```

5. Run:
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Features

- Track unlimited websites
- Custom check intervals
- Visual diff viewer
- Download content as markdown
- Email/password auth

## Deploy

```bash
# Deploy Convex
npx convex deploy

# Deploy to Vercel
vercel
```

Add `NEXT_PUBLIC_CONVEX_URL` to your Vercel environment variables.

## License

MIT