Attendance Tracker - Vercel project

public/index.html    normal version: AI scan runs on YOUR server key (api/scan.js)
public/own-key.html  own-key version (/own-key): each user pastes their own Gemini key, AI runs in their browser
api/scan.js          reads a timetable photo with Gemini, with per-visitor + daily limits
api/visit.js         visitor counter (needs a Redis database)

Environment variables (Vercel > Project > Settings > Environment Variables):
  GEMINI_API_KEY     required for the normal version
  GEMINI_MODEL       optional, default gemini-2.5-flash (change if Google retires it)
  SCAN_PER_DAY       optional, scans per visitor per day (default 3)
  SCAN_DAILY_CAP     optional, scans for the whole site per day (default 100)
  KV_REST_API_URL + KV_REST_API_TOKEN   added automatically when you connect an Upstash Redis database
