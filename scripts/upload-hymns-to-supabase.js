/*
  One-time uploader: inserts/updates all hymns JSON files into Supabase.
  Requirements:
  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY env vars
  - Table public.hymns (see supabase/schema.sql)
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const hymnsDir = path.join(process.cwd(), 'hymns');
  const files = fs.readdirSync(hymnsDir).filter(f => f.endsWith('.json'));

  let processed = 0;
  let failed = 0;
  const batch = [];

  for (const file of files) {
    try {
      const full = path.join(hymnsDir, file);
      const raw = fs.readFileSync(full, 'utf8');
      const json = JSON.parse(raw);

      const hymnNumber = String(json.hymnNumber);
      const title = String(json.title || '').trim();
      const lyrics = String(json.lyrics || '').trim();
      const category = json.category ? String(json.category) : '';
      const author = json.author && typeof json.author === 'object' ? json.author : null;

      batch.push({ hymnNumber, title, lyrics, category, author });
      processed++;
    } catch (e) {
      failed++;
      console.error('Failed to read/parse', file, e.message);
    }
  }

  // Upsert in chunks to avoid payload limits
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    const { error, count } = await supabase
      .from('hymns')
      .upsert(chunk, { onConflict: 'hymnNumber' })
      .select('hymnNumber', { count: 'exact' });
    if (error) {
      console.error('Upsert error:', error.message);
      failed += chunk.length;
    } else {
      inserted += chunk.length;
    }
  }

  console.log('Processed:', processed, 'Inserted/Updated:', inserted, 'Failed:', failed);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


