# Deploy Ridely Frontend to Netlify

## Step 1: Build settings

- **Branch to deploy:** `main`
- **Build command:** `npm run build`
- **Publish directory:** Leave as Netlify’s suggestion for Next.js (often `.next` or auto-set by the Next.js runtime). If the first deploy fails, try `.next` or check Netlify’s Next.js docs.
- **Base directory:** Leave empty (repo root is the frontend).

## Step 2: Environment variables

Add these in **Site settings → Environment variables** (or during “Add environment variables” at deploy).

Replace `https://ridely-backend.onrender.com` with your real Render backend URL if different.

See the table below for copy-paste.

## Step 3: Deploy

Click **Deploy Ridely Frontend** (or **Deploy site**). Wait for the build. Your site URL will be like `https://something.netlify.app`.

## Step 4: After deploy

1. Open your site URL and test sign-in and one ride flow.
2. In **Clerk Dashboard** → **Configure** → **Paths**, add your Netlify URL to **Allowed redirect URLs** (e.g. `https://yoursite.netlify.app/**`).
3. In your **Render backend** env vars, set `FRONTEND_URL` to your Netlify URL (e.g. `https://yoursite.netlify.app`) so CORS works.

## If build fails

- Check the build log; Next.js may need Node 18+. In Netlify **Build settings**, set **Environment** to Node 18 or 20.
- If it says “publish directory” or “output”, leave publish directory as Netlify’s default for Next.js or set to `.next`.
