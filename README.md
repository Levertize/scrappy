# AI Web Scraper

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D%2018.0.0-blue.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%203-003B57.svg)](https://www.sqlite.org/)
[![Backend](https://img.shields.io/badge/Backend-Express.js-lightgrey.svg)](https://expressjs.com/)
[![AI Engine](https://img.shields.io/badge/AI%20Engine-Gemini%202.5%20Flash-4285F4.svg)](https://aistudio.google.com/)
[![Scraper Engine](https://img.shields.io/badge/Scraper-Playwright%20%26%20Cheerio-2EAD5F.svg)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An AI-powered web scraping and monitoring platform that allows users to extract structured data from any website, schedule regular monitoring runs, automatically analyze content changes using Google Gemini, send alerts via email (SMTP), and chat interactively with the scraped data.

---

## Features

- **Semantic Scraping**: Automatically scrape static and dynamic JS-rendered websites using Playwright and Cheerio, with data structure extraction powered by Gemini AI.
- **Automated Monitoring**: Schedule URL scrapes at customizable intervals (e.g., 30 minutes, hourly, daily) driven by a background runner (`node-cron`).
- **AI Change Detection (Diff)**: Compare website snapshots semantically using Google Gemini to identify and summarize changes (ignoring boilerplate code, advertisements, and whitespace modifications).
- **Multi-channel Alerts**: Receive notifications within the app and via email (SMTP) when significant changes are detected.
- **Conversational Data Analysis**: Chat directly with scraped data in a native chat interface, allowing users to query, summarize, and aggregate results using Gemini's context injection.
- **Data Exporting**: Download scraped results in structured formats (JSON and CSV).
- **Vanilla Single Page Application**: Fast and intuitive dashboard built with vanilla HTML, CSS, and JavaScript.

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (via `better-sqlite3`)
- **Web Scraping**: Playwright (JS rendering & browser automation), Cheerio (HTML parsing)
- **Generative AI**: Google Gemini 2.5 Flash API
- **Task Scheduling**: Node-cron
- **Email Notifications**: Nodemailer (SMTP)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (Single Page Application)

---

## Project Structure

```
├── data/                       # Local SQLite database files
├── src/
│   ├── ai/
│   │   └── gemini.js           # Google Gemini API client
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT Authentication middleware
│   │   │   └── rateLimit.js    # Express rate limit configuration
│   │   └── routes/
│   │       ├── auth.js         # Auth endpoints (Register, Login, Me)
│   │       ├── chat.js         # Conversational analytics endpoint
│   │       ├── export.js       # Data export (JSON, CSV) endpoints
│   │       ├── notifications.js# Notification retrieval & actions
│   │       ├── schedule.js     # Monitoring schedule management
│   │       └── scrape.js       # Manual scraping endpoints
│   ├── notifications/
│   │   └── notifier.js         # SMTP and in-app notification engine
│   ├── scheduler/
│   │   └── scheduler.js        # Background job scheduling runner
│   ├── scraper/
│   │   ├── extractor.js        # Coordinates scrape and Gemini AI schema parsing
│   │   ├── parser.js           # Cheerio-based text/content extraction
│   │   └── playwright.js       # Playwright browser browser runner
│   ├── storage/
│   │   └── db.js               # Database schema initialization and query helpers
│   ├── ui/
│   │   ├── css/
│   │   │   └── style.css       # SPA Stylesheets
│   │   ├── js/
│   │   │   └── app.js          # SPA Frontend controller
│   │   ├── index.html          # Main application page
│   │   └── login.html          # User authentication page
│   └── server.js               # Server entry point
├── .env.example                # Example environment variables
├── package.json                # Project dependencies and npm scripts
└── PRD-AI-Web-Scraper.md       # Product Requirements Document
```

---

## Prerequisites

- Node.js >= 18.0.0
- Google Gemini API Key (obtain from [Google AI Studio](https://aistudio.google.com/))
- SMTP Credentials (optional, e.g., Google App Password for email alerts)

---

## Installation & Setup

1. **Clone the repository and navigate to the directory**:
   ```bash
   cd scrappy
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   ```

4. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your variables:
   ```bash
   cp .env.example .env
   ```
   Modify the `.env` file with your Gemini API key and SMTP configurations:
   ```ini
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-secret-key
   GEMINI_API_KEY=your-gemini-api-key
   DATABASE_PATH=./data/scraper.db
   
   # SMTP settings for notification emails
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=AI Web Scraper <your-email@gmail.com>
   ```

---

## Running the Application

### Development Mode

Runs the server with hot-reloading (`nodemon`):
```bash
npm run dev
```

### Production Mode

Runs the server in standard production mode:
```bash
npm start
```

Once running, the interface will be accessible at: `http://localhost:3000`

---

## API Endpoints Reference

All endpoints (except Authentication) require an `Authorization` header with a valid JWT token:
`Authorization: Bearer <your_jwt_token>`

### Authentication
- `POST /api/auth/register` - Create a new account.
  - Body: `{ "username": "...", "email": "...", "password": "..." }`
- `POST /api/auth/login` - Login to get a JWT token.
  - Body: `{ "email": "...", "password": "..." }`
- `GET /api/auth/me` - Get current authenticated user details.

### Manual Scraping
- `POST /api/scrape` - Run a web scrape job.
  - Body: `{ "url": "https://example.com", "name": "Optional Name" }`
- `GET /api/scrape` - Get all scrape jobs.
- `GET /api/scrape/:id` - Get details & results of a specific scrape job.
- `DELETE /api/scrape/:id` - Delete a scrape job history.

### Monitoring Schedules
- `POST /api/schedule` - Create a scheduled monitoring job.
  - Body: `{ "url": "https://example.com", "name": "My Monitor", "interval": "1h" }`
- `GET /api/schedule` - List all active monitoring jobs.
- `GET /api/schedule/intervals` - Get available cron intervals.
- `PUT /api/schedule/:id` - Pause, resume, or update notification settings.
  - Body: `{ "action": "pause" | "resume" }` or `{ "alert_enabled": true, "alert_email": true }`
- `DELETE /api/schedule/:id` - Delete a monitoring job.
- `GET /api/schedule/:id/history` - Retrieve change history of a specific schedule.

### Data Chat & Query
- `POST /api/chat` - Chat contextually with your scraped data.
  - Body: `{ "message": "What is the cheapest item in this data?", "scrapeId": "..." }`

### Data Export
- `GET /api/export/:scrapeId/json` - Export a dataset to JSON.
- `GET /api/export/:scrapeId/csv` - Export a dataset to CSV.

### Notifications
- `GET /api/notifications` - Retrieve in-app notification history.
- `POST /api/notifications/read` - Mark all notifications as read.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
