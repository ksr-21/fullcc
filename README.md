# Campus Connect

Campus Connect is a campus-focused social and academic app built with React + Vite, with optional Capacitor support for mobile builds.

## Prerequisites

- Node.js 18+ (LTS recommended)

## Run Locally

1. Install dependencies:
   `npm install`
2. Update environment variables:
   - Copy `backend/.env.example` to `backend/.env` and update `MONGODB_URI` with your connection string.
   - (Optional) Create a `.env` in the root directory for frontend variables like `VITE_API_URL` (defaults to `http://localhost:5000/api`).
3. Start the backend:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. Start the frontend:
   ```bash
   npm install
   npm run dev
   ```

## Troubleshooting

### "Login failed: Failed to fetch"
This usually means the frontend cannot reach the backend.
1. Check if the backend is running on port 5000.
2. Ensure `CORS_ORIGIN` in `backend/.env` includes `http://localhost:5173`.
3. Check if your IP address is whitelisted in your MongoDB Atlas cluster if you are using Atlas.

## Build for Production

1. Build:
   `npm run build`
2. Preview the production build:
   `npm run preview`

## Capacitor (Optional)

If you plan to build for iOS/Android with Capacitor, ensure the Capacitor CLI is available and follow your platform setup requirements.
