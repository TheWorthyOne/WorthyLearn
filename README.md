# WorthyLearn

An MVP for an AI-generated learning site: enter any topic, generate a nested syllabus, expand branches, and view the same structure as a mindmap.

## Features

- Topic-to-course generator
- Adjustable target audience and depth
- Nested modules, objectives, estimated time, difficulty
- Expand any branch with AI
- Mindmap visualization
- Supabase-ready persistence
- OpenAI-compatible AI API configuration
- Fallback demo generation when no AI key is configured

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AI_API_KEY=...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

If your AI provider is OpenAI-compatible, set `AI_BASE_URL` and `AI_MODEL` to that provider's values.

## Supabase

Run `supabase/schema.sql` in the Supabase SQL editor to create the `courses` table and RLS policies.

## Notes

This is intentionally not a clone of roadmap.sh or Gajix. It implements the same broad product concept with original UI and code.

