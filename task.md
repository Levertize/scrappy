# Phase 1 MVP — Task Tracker

## Tahap 1: Project Setup & Infrastructure ✅
- [x] package.json — project metadata, scripts, dependencies
- [x] .env.example — environment variable template
- [x] src/server.js — Express server entrypoint
- [x] src/storage/db.js — SQLite database + schema
- [x] Update .gitignore — add node_modules, .env, *.db

## Tahap 2: Authentication System ✅
- [x] src/api/middleware/auth.js — JWT verification
- [x] src/api/middleware/rateLimit.js — rate limiter
- [x] src/api/routes/auth.js — register/login/me endpoints
- [x] src/ui/login.html + login.css + login.js — login/register page
- [x] Update app.js — auth check, logout, real user name

## Tahap 3: Scraping Engine ✅
- [x] src/scraper/playwright.js — browser automation
- [x] src/scraper/parser.js — HTML parsing (Cheerio)
- [x] src/api/routes/scrape.js — scrape API endpoints
- [x] Wire front-end New Scrape modal with polling

## Tahap 4: AI Data Extraction ✅
- [x] src/ai/claude.js — Claude API client
- [x] src/scraper/extractor.js — AI extraction orchestration
- [x] Update scrape route to include extraction pipeline
- [x] Graceful fallback when API key not configured

## Tahap 5: Export & Chat ✅
- [x] src/api/routes/export.js — JSON/CSV export (with query token auth)
- [x] src/ai/chat.js — RAG chat context management
- [x] src/api/routes/chat.js — chat API endpoint
- [x] Wire front-end chat widget to real /api/chat
- [x] Wire front-end export buttons with format selection
- [x] Dashboard loads real data from API
