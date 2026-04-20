// config.js — Supabase credentials
// ⚠️  IMPORTANT: Replace with YOUR project's URL and anon key from:
//     Supabase Dashboard → Settings → API
//
// The SUPABASE_ANON_KEY must be the full JWT token (starts with "eyJ...")
// NOT the "sb_publishable_..." shorthand key — that format causes 400 errors.
//
// How to find it:
//   1. Go to https://supabase.com/dashboard
//   2. Select your project
//   3. Go to Settings → API
//   4. Copy the "anon public" key (the long eyJ... JWT)

window.APP_CONFIG = {
  SUPABASE_URL:      "https://tesnrbtmkamdhmcjxyak.supabase.co",
  SUPABASE_ANON_KEY: "REPLACE_WITH_YOUR_ANON_JWT_KEY_FROM_SUPABASE_DASHBOARD"
  // Example of correct format:
  // SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc25yYnRta2FtZGhtY2p4eWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAxNTM2MDAwMH0.XXXXXXXXXX"
};
