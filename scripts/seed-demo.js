/*
  Seed a Demo Supabase with a small set of local hymns.
  Usage:
    HYMNS="1,2,3,10,355,355a" SUPABASE_URL=... SUPABASE_SECRET=... node scripts/seed-demo.js
    or
    SUPABASE_URL=... SUPABASE_SECRET=... node scripts/seed-demo.js 1,2,3,10,355,355a

  Notes:
  - Accepts SUPABASE_SECRET or SUPABASE_SERVICE_ROLE_KEY.
  - Inserts/updates into public.hymns using lowercase column names (hymnnumber,...).
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SECRET =
    process.env.SUPABASE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SECRET) {
    console.error('Missing SUPABASE_URL or SUPABASE_SECRET/SUPABASE_SERVICE_ROLE_KEY env vars');
    process.exit(1);
  }

  // Determine which hymnNumbers to seed
  const argList = (process.argv[2] || process.env.HYMNS || '').trim();
  const desired = new Set(
    (argList
      ? argList.split(/[\s,]+/)
      : ['1', '2', '3', '10', '355', '355a']
    ).map((s) => String(s).trim().toLowerCase()).filter(Boolean)
  );
  console.log('Seeding hymnNumbers:', Array.from(desired).join(', '));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
    auth: { persistSession: false },
  });

  const hymnsDir = path.join(process.cwd(), 'hymns');
  const files = fs.readdirSync(hymnsDir).filter((f) => f.endsWith('.json'));

  const batch = [];
  let matched = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(hymnsDir, file), 'utf8');
      const json = JSON.parse(raw);
      const hymnNumber = String(json.hymnNumber || '').toLowerCase();
      if (!desired.has(hymnNumber)) {
        skipped++;
        continue;
      }
      const title = String(json.title || '').trim();
      const lyrics = String(json.lyrics || '').trim();
      const category = json.category ? String(json.category) : '';
      const author = json.author && typeof json.author === 'object' ? json.author : null;
      batch.push({ hymnnumber: hymnNumber, title, lyrics, category, author });
      matched++;
    } catch (e) {
      console.error('Failed to parse', file, e.message);
    }
  }

  if (matched === 0) {
    console.error('No matching hymns found for the requested list.');
    process.exit(1);
  }

  console.log(`Uploading ${matched} hymns to Supabase demo...`);
  const { error } = await supabase
    .from('hymns')
    .upsert(batch, { onConflict: 'hymnnumber' });
  if (error) {
    console.error('Upsert error:', error.message);
    process.exit(1);
  }

  console.log('Done. Seeded hymns:', batch.map((b) => b.hymnnumber).join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


