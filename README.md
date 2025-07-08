# Firecrawl Observer

A web application for monitoring website changes using Firecrawl's change detection API. Built with Next.js, Convex, and TypeScript.

## Features

- Monitor multiple websites for content changes
- Customizable check intervals (minimum 5 minutes)
- Visual diff viewer for tracking changes
- Markdown export of scraped content
- Real-time updates with Convex
- User authentication
- Responsive design

## Prerequisites

- Node.js 18+ and npm/pnpm
- A Convex account
- A Firecrawl API key

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fc-observer.git
cd fc-observer
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up Convex:
```bash
npx convex dev
```
This will prompt you to log in to Convex and set up a new project.

4. Configure environment variables:

Create a `.env.local` file in the root directory:
```env
# Convex deployment URL (from your Convex dashboard)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Firecrawl API key
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

5. Set the Firecrawl API key in Convex:
```bash
npx convex env set FIRECRAWL_API_KEY your_firecrawl_api_key_here
```

6. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

1. Create an account or sign in
2. Add a website by entering its URL (https:// is automatically added if omitted)
3. Set the check interval (how often to check for changes)
4. Monitor your websites from the dashboard
5. View change history and diffs when content changes are detected
6. Download scraped content as markdown files

## Architecture

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Convex for serverless functions and real-time database
- **Authentication**: Convex Auth with email/password
- **Web Scraping**: Firecrawl API for content extraction and change detection
- **Scheduling**: Convex cron jobs running every 5 minutes to check websites based on their individual intervals

## Deployment

1. Deploy to Vercel:
```bash
vercel
```

2. Set environment variables in your Vercel project settings:
   - `NEXT_PUBLIC_CONVEX_URL`
   - Add the Firecrawl API key to your Convex deployment

3. Deploy Convex to production:
```bash
npx convex deploy
```

## License

MIT