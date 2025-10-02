# Vercel Deployment Guide

## Quick Setup

1. **Push to GitHub**
   - Create a new repository on GitHub
   - Push this project to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Vite project

3. **Environment Variables**
   Add these environment variables in your Vercel project settings:
   ```
   VITE_SUPABASE_URL=https://fhdijubftjysqsdpblph.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZGlqdWJmdGp5c3FzZHBibHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzI4NzEsImV4cCI6MjA3MTQwODg3MX0.NsIY9---aCHN4aypZWXWXPTReC3SQ_WzZokhUQyRq3I
   VITE_SUPABASE_PROJECT_ID=fhdijubftjysqsdpblph
   ```

4. **Deploy**
   - Click "Deploy"
   - Your app will be live at `https://your-project-name.vercel.app`

## Project Configuration

- ✅ **vercel.json** - Vercel configuration with SPA routing
- ✅ **vite.config.ts** - Optimized for production builds
- ✅ **Environment variables** - Ready for Vercel deployment
- ✅ **Build optimization** - Terser minification and no source maps for production

## Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Custom Domain

After deployment, you can add a custom domain in Vercel project settings.

## Supabase Edge Functions

If you're using Supabase Edge Functions, make sure to deploy them separately:

```bash
supabase functions deploy
```