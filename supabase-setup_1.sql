-- ============================================================
--  SUPABASE SETUP — Оюутны Мэдээний Платформ
--  Run this entire script in Supabase → SQL Editor → New Query
-- ============================================================

-- ── 0. Extensions ────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. PROFILES ──────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '',
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone can read profiles (needed for author names)
drop policy if exists "profiles_select_all"  on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- Users can insert/upsert their own profile
drop policy if exists "profiles_insert_own"  on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own"  on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ── 2. NEWS_POSTS ─────────────────────────────────────────────
create table if not exists public.news_posts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  category    text not null default 'Сургууль',
  content     text not null,
  image_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.news_posts enable row level security;

drop policy if exists "posts_select_all"   on public.news_posts;
create policy "posts_select_all"
  on public.news_posts for select
  using (true);

drop policy if exists "posts_insert_auth"  on public.news_posts;
create policy "posts_insert_auth"
  on public.news_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "posts_update_own"   on public.news_posts;
create policy "posts_update_own"
  on public.news_posts for update
  using (auth.uid() = user_id);

drop policy if exists "posts_delete_own"   on public.news_posts;
create policy "posts_delete_own"
  on public.news_posts for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists news_posts_updated_at on public.news_posts;
create trigger news_posts_updated_at
  before update on public.news_posts
  for each row execute function public.set_updated_at();

-- ── 3. COMMENTS ───────────────────────────────────────────────
create table if not exists public.comments (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid not null references public.news_posts(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  comment_text  text not null,
  created_at    timestamptz not null default now()
);

alter table public.comments enable row level security;

drop policy if exists "comments_select_all"   on public.comments;
create policy "comments_select_all"
  on public.comments for select
  using (true);

drop policy if exists "comments_insert_auth"  on public.comments;
create policy "comments_insert_auth"
  on public.comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "comments_delete_own"   on public.comments;
create policy "comments_delete_own"
  on public.comments for delete
  using (auth.uid() = user_id);

-- ── 4. POST_LIKES ─────────────────────────────────────────────
create table if not exists public.post_likes (
  post_id    uuid not null references public.news_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

drop policy if exists "likes_select_all"   on public.post_likes;
create policy "likes_select_all"
  on public.post_likes for select
  using (true);

drop policy if exists "likes_insert_auth"  on public.post_likes;
create policy "likes_insert_auth"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own"   on public.post_likes;
create policy "likes_delete_own"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- ── 5. STORAGE BUCKET ─────────────────────────────────────────
-- Run via the SQL API (storage schema)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,   -- 5 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public            = true,
      file_size_limit   = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Storage RLS policies
drop policy if exists "storage_images_select" on storage.objects;
create policy "storage_images_select"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "storage_images_insert" on storage.objects;
create policy "storage_images_insert"
  on storage.objects for insert
  with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

drop policy if exists "storage_images_delete" on storage.objects;
create policy "storage_images_delete"
  on storage.objects for delete
  using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── 6. FOREIGN-KEY INDEXES (performance) ──────────────────────
create index if not exists idx_posts_user_id    on public.news_posts(user_id);
create index if not exists idx_comments_post_id on public.comments(post_id);
create index if not exists idx_comments_user_id on public.comments(user_id);
create index if not exists idx_likes_post_id    on public.post_likes(post_id);
