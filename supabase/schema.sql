-- SoulArt database. Paste this whole file into Supabase > SQL Editor and click Run.
-- It is safe to run more than once.

-- ---------------------------------------------------------------------------
-- Admins: only users listed here may change content.
-- Signing up is not enough, so an open Supabase sign-up form can't grant access.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Collections: name and description required, image optional.
-- ---------------------------------------------------------------------------
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) > 0),
  slug        text not null unique,
  description text not null default '',
  image       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Products: each belongs to one collection and must have at least one image.
-- images holds storage paths in display order; the first one is the cover.
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  name          text not null check (char_length(trim(name)) > 0),
  slug          text not null unique,
  description   text not null default '',
  images        text[] not null check (cardinality(images) >= 1 and array_position(images, null) is null),
  is_featured   boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists products_collection_idx on public.products (collection_id, sort_order);
create index if not exists products_featured_idx on public.products (sort_order) where is_featured;

-- ---------------------------------------------------------------------------
-- Site settings: the editable text and images on Home, About and Contact.
-- Always exactly one row.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id                  integer primary key default 1 check (id = 1),
  hero_title          text not null default 'SoulArt',
  hero_tagline        text not null default 'Art and crafts made by hand, gathered into collections you can explore piece by piece.',
  hero_image          text,
  intro_heading       text not null default 'Made slowly, by hand.',
  intro_text          text not null default 'Each piece starts as an idea and a pair of hands. Browse the collections to see what we have been making.',
  works_heading       text not null default 'Selected Works',
  collections_title   text not null default 'Collections',
  collections_tagline text not null default 'Every collection is a family of pieces that share a material, a technique or a story.',
  collections_image   text,
  about_title         text not null default 'About SoulArt',
  about_tagline       text not null default 'We are an organization of makers creating art and crafts with care.',
  about_image         text,
  mission_lead        text not null default 'SoulArt brings together art and craft',
  mission_text        text not null default 'so that the work of many hands can be seen in one place.',
  about_body_heading  text not null default 'Our story',
  about_body          text not null default 'Tell your story here. You can change this text in the admin panel under Site content.',
  about_body_image    text,
  contact_heading     text not null default 'Let''s Chat',
  contact_image       text,
  contact_email       text not null default 'hello@soulart.com',
  contact_phone       text not null default '',
  contact_address     text not null default '',
  instagram_url       text not null default '',
  facebook_url        text not null default '',
  footer_heading      text not null default 'Explore the collections'
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Messages sent through the contact form.
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 200),
  email      text not null check (char_length(email) between 3 and 320 and email like '%@%'),
  message    text not null check (char_length(trim(message)) between 1 and 5000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security: visitors read, admins write.
-- ---------------------------------------------------------------------------
alter table public.collections      enable row level security;
alter table public.products         enable row level security;
alter table public.site_settings    enable row level security;
alter table public.contact_messages enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.collections, public.products, public.site_settings to anon, authenticated;
grant insert, update, delete on public.collections, public.products to authenticated;
grant update on public.site_settings to authenticated;
grant select, update, delete on public.contact_messages to authenticated;
-- Visitors may only supply these three columns when sending a message.
grant insert (name, email, message) on public.contact_messages to anon, authenticated;

drop policy if exists "collections are public" on public.collections;
create policy "collections are public" on public.collections for select using (true);
drop policy if exists "admins manage collections" on public.collections;
create policy "admins manage collections" on public.collections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products are public" on public.products;
create policy "products are public" on public.products for select using (true);
drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings are public" on public.site_settings;
create policy "settings are public" on public.site_settings for select using (true);
drop policy if exists "admins update settings" on public.site_settings;
create policy "admins update settings" on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "anyone can send a message" on public.contact_messages;
create policy "anyone can send a message" on public.contact_messages for insert to anon, authenticated
  with check (is_read = false);
drop policy if exists "admins read messages" on public.contact_messages;
create policy "admins read messages" on public.contact_messages for select to authenticated
  using (public.is_admin());
drop policy if exists "admins update messages" on public.contact_messages;
create policy "admins update messages" on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete messages" on public.contact_messages;
create policy "admins delete messages" on public.contact_messages for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Image storage: public bucket, admin-only uploads, bitmap images up to 10 MB.
-- SVG is left out on purpose because it can carry scripts.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins read media objects" on storage.objects;
create policy "admins read media objects" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_admin());
drop policy if exists "admins upload media" on storage.objects;
create policy "admins upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "admins update media" on storage.objects;
create policy "admins update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
drop policy if exists "admins delete media" on storage.objects;
create policy "admins delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
