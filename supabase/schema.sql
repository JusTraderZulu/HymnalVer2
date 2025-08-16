create table if not exists public.hymns (
  hymnNumber text primary key,
  title text not null,
  lyrics text not null,
  category text,
  author jsonb
);

-- Optional helpful index for title search
create index if not exists hymns_title_idx on public.hymns using gin (to_tsvector('english', title));


