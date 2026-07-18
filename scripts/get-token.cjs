#!/usr/bin/env node
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const email = process.env.TEST_TENANT_EMAIL;
  const password = process.env.TEST_TENANT_PASSWORD;

  if (!url || !key || !email || !password) {
    console.error("Missing env variables");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("Auth error:", error.message);
    process.exit(1);
  }
  console.log(data.session.access_token);
}

main();
