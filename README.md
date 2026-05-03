# Node.js Backend Setup

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

**Required:**
- `GEMINI_API_KEY`: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON (get from Firebase Console → Settings → Service Accounts)

### 3. Run Development Server
```bash
npm run dev
```

Server will start at `http://localhost:5000`

### 4. Check Health
Visit `http://localhost:5000/health` to verify the server is running.

---

## API Endpoints

All endpoints require Firebase authentication (Bearer token in `Authorization` header).

### URL Parsing
- **POST** `/api/parse-url` - Extract structured data from a URL
- **POST** `/api/parse-text` - Extract structured data from text content

### AI Analysis
- **POST** `/api/analyze` - General LLM analysis
- **POST** `/api/analyze-job` - Analyze job description
- **POST** `/api/generate-cover-letter` - Generate cover letter
- **POST** `/api/interview-tips` - Get interview preparation tips

---

## Frontend Configuration

Set the backend URL in your frontend `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

For production, update to your deployed backend URL:
```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Node.js)
```bash
npm install -g vercel
vercel
```

### Option 2: Railway
1. Push to GitHub
2. Connect repository to Railway
3. Add environment variables
4. Deploy

### Option 3: Render
1. Create new Web Service on Render
2. Connect GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables

### Option 4: Self-hosted (VPS/EC2)
```bash
# SSH into your server
ssh user@your-server.com

# Clone repository
git clone your-repo-url
cd JobAI/backend

# Install dependencies and run
npm install
npm start

# Use PM2 for process management
npm install -g pm2
pm2 start server.js --name "jobai-backend"
pm2 save
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key |
| `FIREBASE_SERVICE_ACCOUNT` | **Yes** | Firebase service account JSON |
| `FRONTEND_URL` | No | Primary frontend origin allowed by CORS |
| `ALLOWED_ORIGINS` | No | Comma-separated additional CORS origins |

---

## Troubleshooting

### "GEMINI_API_KEY not set"
- Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Add to `.env` file

### "Firebase Admin initialization failed"
- Download service account key from Firebase Console
- Either set `FIREBASE_SERVICE_ACCOUNT` env var or `GOOGLE_APPLICATION_CREDENTIALS`

### CORS errors
- Set `FRONTEND_URL` to your deployed frontend origin
- Check that frontend URL is in `ALLOWED_ORIGINS`
- Default allowed: `localhost:5173`, `localhost:3000`, `localhost:5000`

### 401 Unauthorized responses
- Ensure Firebase token is sent in `Authorization: Bearer {token}` header
- Token must be a valid Firebase ID token

---

## Development Notes

- Hot-reload enabled with `nodemon` (use `npm run dev`)
- All API responses follow a standard JSON format:
  ```json
  {
    "success": true/false,
    "data": {...},
    "error": "error message (if failed)"
  }
  ```
- Firebase Admin SDK handles authentication and Firestore access
- Gemini API is called for all AI analysis tasks
