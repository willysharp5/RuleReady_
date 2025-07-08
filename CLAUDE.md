# Project Guidelines for Claude

## Code Style Rules

1. **NO EMOJIS**: Never use emojis in any code, comments, or UI text. This includes:
   - Component files
   - Configuration files
   - Documentation
   - UI strings
   - Console messages
   - Error messages
   - Git commits

2. **Testing**: When completing a task, always run the following commands to ensure code quality:
   ```bash
   npm run lint
   npm run typecheck
   ```

## Project-Specific Information

- This is a Firecrawl Observer project using Convex for backend and Next.js for frontend
- Authentication uses Convex Auth with JWT
- The project monitors websites for changes using Firecrawl's change tracking API