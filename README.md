# TinyURL URL Shortener Setup

This repository implements a production-grade URL shortener system designed for high concurrency and sub-millisecond retrieval. It incorporates Express, TypeScript, PostgreSQL, Redis caching, rate limiting, and an asynchronous queue-based analytics engine.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Docker and Docker Compose (to run Redis & PostgreSQL)

### 1. Database & Cache Services Setup
Start PostgreSQL and Redis containers:
```bash
docker-compose up -d
```
*This initializes PostgreSQL automatically using `./init.sql` schema.*

### 2. Environment Configurations
Create a `.env` file in the root directory:
```env
PORT=3000
DATABASE_URL=postgresql://tinyuser:tinypassword@localhost:5432/tinyurl_db
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Running the Services
To start the API Server in development mode:
```bash
npm run dev
```

To start the Background Worker in development mode:
```bash
npm run worker:dev
```

---

## 📡 API Endpoints

### 1. Shorten URL
*   **Method**: `POST`
*   **Path**: `/api/v1/shorten`
*   **Headers**: `Content-Type: application/json`
*   **Body**:
    ```json
    {
      "long_url": "https://www.google.com/search?q=system+design",
      "custom_alias": "sysdesign",
      "expires_at": "2026-12-31T23:59:59.000Z"
    }
    ```
    *(Note: `custom_alias` and `expires_at` are optional)*
*   **Response**: `201 Created`
    ```json
    {
      "id": 1,
      "short_code": "sysdesign",
      "short_url": "http://localhost:3000/sysdesign",
      "long_url": "https://www.google.com/search?q=system+design",
      "created_at": "2026-05-28T11:00:00.000Z",
      "expires_at": "2026-12-31T23:59:59.000Z",
      "is_custom": true
    }
    ```

### 2. URL Redirection
*   **Method**: `GET`
*   **Path**: `/:shortCode`
*   **Action**: Redirects client to the long URL via `302 Found`. Pushes analytics click event to Redis stream.

### 3. URL Analytics
*   **Method**: `GET`
*   **Path**: `/api/v1/analytics/:shortCode`
*   **Response**: `200 OK`
    ```json
    {
      "shortCode": "sysdesign",
      "longUrl": "https://www.google.com/search?q=system+design",
      "createdAt": "2026-05-28T11:00:00.000Z",
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "totalClicks": 125,
      "uniqueVisitors": 98,
      "topReferrers": [
        { "referrer": "https://news.ycombinator.com/", "count": 82 },
        { "referrer": "Direct/Unknown", "count": 43 }
      ],
      "clicksTimeline7Days": [
        { "date": "2026-05-27T00:00:00.000Z", "count": 45 },
        { "date": "2026-05-28T00:00:00.000Z", "count": 80 }
      ]
    }
    ```
