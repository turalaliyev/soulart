-- SoulArt database. Paste this whole file into Supabase > SQL Editor and click Run.
-- It is safe to run more than once, including on a database created by an earlier version of this file.
--
-- Structure: categories hold collections, and each collection holds its pictures.
--
-- Languages: Azerbaijani, the default, lives in the normal columns. Russian and English live in each
-- row's `translations` column, as {"ru": {"name": "..."}, "en": {...}}. A blank translation falls back to Azerbaijani.

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
-- Upgrade from the earlier layout, where collections held products.
-- The old collections become categories and the old products become collections,
-- keeping every row, picture and translation. Does nothing on a new or already upgraded database.
-- ---------------------------------------------------------------------------
do $$
declare
  old_name text;
begin
  if to_regclass('public.products') is not null and to_regclass('public.categories') is null then
    -- Old policies move with their tables; new ones with new names are created further down.
    drop policy if exists "collections are public" on public.collections;
    drop policy if exists "admins manage collections" on public.collections;
    drop policy if exists "products are public" on public.products;
    drop policy if exists "admins manage products" on public.products;

    alter table public.collections rename to categories;
    alter table public.products rename to collections;
    alter table public.collections rename column collection_id to category_id;
    alter index if exists public.products_collection_idx rename to collections_category_idx;
    alter index if exists public.products_featured_idx rename to collections_featured_idx;
    -- Constraint names follow the tables. Categories first, so the collections_ names are free.
    for old_name in select conname from pg_constraint where conrelid = 'public.categories'::regclass and conname like 'collections\_%' loop
      execute format('alter table public.categories rename constraint %I to %I', old_name, 'categories_' || substr(old_name, 13));
    end loop;
    for old_name in select conname from pg_constraint where conrelid = 'public.collections'::regclass and conname like 'products\_%' loop
      execute format('alter table public.collections rename constraint %I to %I', old_name,
        replace('collections_' || substr(old_name, 10), 'collection_id', 'category_id'));
    end loop;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'site_settings' and column_name = 'collections_title') then
    alter table public.site_settings rename column collections_title to categories_title;
    alter table public.site_settings rename column collections_tagline to categories_tagline;
    alter table public.site_settings rename column collections_image to categories_image;
  end if;

  -- The Russian and English text for those fields is keyed by column name inside `translations`.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'site_settings' and column_name = 'translations') then
    update public.site_settings set translations = coalesce((
      select jsonb_object_agg(lang, case when jsonb_typeof(value) = 'object' then
        (value - 'collections_title' - 'collections_tagline') || jsonb_strip_nulls(jsonb_build_object(
          'categories_title', value -> 'collections_title',
          'categories_tagline', value -> 'collections_tagline'))
        else value end)
      from jsonb_each(translations) as entry (lang, value)
    ), '{}'::jsonb)
    where translations::text like '%collections_t%';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Categories: name and description required, image optional.
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) > 0),
  slug        text not null unique,
  description text not null default '',
  image       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Collections: each belongs to one category and holds its pictures, at least one.
-- images holds storage paths in display order; the first one is the cover.
-- ---------------------------------------------------------------------------
create table if not exists public.collections (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories (id) on delete cascade,
  name          text not null check (char_length(trim(name)) > 0),
  slug          text not null unique,
  description   text not null default '',
  images        text[] not null check (cardinality(images) >= 1 and array_position(images, null) is null),
  is_featured   boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists collections_category_idx on public.collections (category_id, sort_order);
create index if not exists collections_featured_idx on public.collections (sort_order) where is_featured;

-- ---------------------------------------------------------------------------
-- Site settings: the editable text and images on Home, About and Contact.
-- Always exactly one row.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id                  integer primary key default 1 check (id = 1),
  hero_title          text not null default 'SoulArt',
  hero_tagline        text not null default 'Əl ilə yaradılmış sənət və sənətkarlıq nümunələri, parça-parça kəşf edə biləcəyiniz kolleksiyalarda.',
  hero_image          text,
  intro_heading       text not null default 'Tələsmədən, əllə yaradılır.',
  intro_text          text not null default 'Hər əsər bir ideya və bir cüt əllə başlayır. Nələr yaratdığımızı görmək üçün kolleksiyalara baxın.',
  works_heading       text not null default 'Seçilmiş işlər',
  categories_title    text not null default 'Kateqoriyalar',
  categories_tagline  text not null default 'Hər kateqoriya eyni materialı, texnikanı və ya hekayəni bölüşən kolleksiyaları bir araya gətirir.',
  categories_image    text,
  about_title         text not null default 'SoulArt haqqında',
  about_tagline       text not null default 'Biz qayğı ilə sənət və sənətkarlıq əsərləri yaradan ustaların təşkilatıyıq.',
  about_image         text,
  mission_lead        text not null default 'SoulArt sənəti və sənətkarlığı birləşdirir ki,',
  mission_text        text not null default 'çoxlu əllərin zəhməti bir yerdə görünsün.',
  about_body_heading  text not null default 'Hekayəmiz',
  about_body          text not null default 'Hekayənizi burada danışın. Bu mətni admin panelində "Sayt məzmunu" bölməsindən dəyişə bilərsiniz.',
  about_body_image    text,
  contact_heading     text not null default 'Gəlin danışaq',
  contact_image       text,
  contact_email       text not null default 'hello@soulart.com',
  contact_phone       text not null default '',
  contact_address     text not null default '',
  instagram_url       text not null default '',
  facebook_url        text not null default '',
  footer_heading      text not null default 'Kolleksiyaları kəşf edin'
);

-- ---------------------------------------------------------------------------
-- Translations. Added with ALTER so existing databases pick them up too.
-- ---------------------------------------------------------------------------
alter table public.categories add column if not exists translations jsonb not null default '{}'
  check (jsonb_typeof(translations) = 'object');
alter table public.collections add column if not exists translations jsonb not null default '{}'
  check (jsonb_typeof(translations) = 'object');
alter table public.site_settings add column if not exists translations jsonb not null default $json${
  "ru": {
    "hero_tagline": "Искусство и ремёсла, созданные вручную и собранные в коллекции, которые можно изучать работа за работой.",
    "intro_heading": "Не спеша, своими руками.",
    "intro_text": "Каждая работа начинается с идеи и пары рук. Загляните в коллекции и посмотрите, что мы создаём.",
    "works_heading": "Избранные работы",
    "categories_title": "Категории",
    "categories_tagline": "Каждая категория объединяет коллекции общим материалом, техникой или историей.",
    "about_title": "О SoulArt",
    "about_tagline": "Мы объединение мастеров, которые с заботой создают произведения искусства и ремёсел.",
    "mission_lead": "SoulArt объединяет искусство и ремесло,",
    "mission_text": "чтобы труд многих рук можно было увидеть в одном месте.",
    "about_body_heading": "Наша история",
    "about_body": "Расскажите здесь свою историю. Этот текст можно изменить в админ-панели в разделе «Контент сайта».",
    "contact_heading": "Давайте поговорим",
    "footer_heading": "Откройте для себя коллекции"
  },
  "en": {
    "hero_tagline": "Art and crafts made by hand, gathered into collections you can explore piece by piece.",
    "intro_heading": "Made slowly, by hand.",
    "intro_text": "Each piece starts as an idea and a pair of hands. Browse the collections to see what we have been making.",
    "works_heading": "Selected Works",
    "categories_title": "Categories",
    "categories_tagline": "Each category brings together collections that share a material, a technique or a story.",
    "about_title": "About SoulArt",
    "about_tagline": "We are an organization of makers creating art and crafts with care.",
    "mission_lead": "SoulArt brings together art and craft",
    "mission_text": "so that the work of many hands can be seen in one place.",
    "about_body_heading": "Our story",
    "about_body": "Tell your story here. You can change this text in the admin panel under Site content.",
    "contact_heading": "Let's Chat",
    "footer_heading": "Explore the collections"
  }
}$json$::jsonb check (jsonb_typeof(translations) = 'object');

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- A database made by the earlier English-only file still holds its English starter text in the
-- Azerbaijani columns. Swap only text that is unchanged, so anything you wrote yourself stays.
update public.site_settings set
  hero_tagline = case hero_tagline when 'Art and crafts made by hand, gathered into collections you can explore piece by piece.' then 'Əl ilə yaradılmış sənət və sənətkarlıq nümunələri, parça-parça kəşf edə biləcəyiniz kolleksiyalarda.' else hero_tagline end,
  intro_heading = case intro_heading when 'Made slowly, by hand.' then 'Tələsmədən, əllə yaradılır.' else intro_heading end,
  intro_text = case intro_text when 'Each piece starts as an idea and a pair of hands. Browse the collections to see what we have been making.' then 'Hər əsər bir ideya və bir cüt əllə başlayır. Nələr yaratdığımızı görmək üçün kolleksiyalara baxın.' else intro_text end,
  works_heading = case works_heading when 'Selected Works' then 'Seçilmiş işlər' else works_heading end,
  categories_title = case categories_title when 'Collections' then 'Kolleksiyalar' else categories_title end,
  categories_tagline = case categories_tagline when 'Every collection is a family of pieces that share a material, a technique or a story.' then 'Hər kolleksiya eyni materialı, texnikanı və ya hekayəni bölüşən əsərlərdən ibarətdir.' else categories_tagline end,
  about_title = case about_title when 'About SoulArt' then 'SoulArt haqqında' else about_title end,
  about_tagline = case about_tagline when 'We are an organization of makers creating art and crafts with care.' then 'Biz qayğı ilə sənət və sənətkarlıq əsərləri yaradan ustaların təşkilatıyıq.' else about_tagline end,
  mission_lead = case mission_lead when 'SoulArt brings together art and craft' then 'SoulArt sənəti və sənətkarlığı birləşdirir ki,' else mission_lead end,
  mission_text = case mission_text when 'so that the work of many hands can be seen in one place.' then 'çoxlu əllərin zəhməti bir yerdə görünsün.' else mission_text end,
  about_body_heading = case about_body_heading when 'Our story' then 'Hekayəmiz' else about_body_heading end,
  about_body = case about_body when 'Tell your story here. You can change this text in the admin panel under Site content.' then 'Hekayənizi burada danışın. Bu mətni admin panelində "Sayt məzmunu" bölməsindən dəyişə bilərsiniz.' else about_body end,
  contact_heading = case contact_heading when 'Let''s Chat' then 'Gəlin danışaq' else contact_heading end,
  footer_heading = case footer_heading when 'Explore the collections' then 'Kolleksiyaları kəşf edin' else footer_heading end
where id = 1;

-- The Categories page used to be the Collections page. Retitle it where the starter text is unchanged.
update public.site_settings set
  categories_title = case categories_title when 'Kolleksiyalar' then 'Kateqoriyalar' else categories_title end,
  categories_tagline = case categories_tagline when 'Hər kolleksiya eyni materialı, texnikanı və ya hekayəni bölüşən əsərlərdən ibarətdir.'
    then 'Hər kateqoriya eyni materialı, texnikanı və ya hekayəni bölüşən kolleksiyaları bir araya gətirir.' else categories_tagline end
where id = 1;
update public.site_settings set translations = jsonb_set(translations, '{ru,categories_title}', '"Категории"')
  where id = 1 and translations #>> '{ru,categories_title}' = 'Коллекции';
update public.site_settings set translations = jsonb_set(translations, '{ru,categories_tagline}', '"Каждая категория объединяет коллекции общим материалом, техникой или историей."')
  where id = 1 and translations #>> '{ru,categories_tagline}' = 'Каждая коллекция объединяет работы общим материалом, техникой или историей.';
update public.site_settings set translations = jsonb_set(translations, '{en,categories_title}', '"Categories"')
  where id = 1 and translations #>> '{en,categories_title}' = 'Collections';
update public.site_settings set translations = jsonb_set(translations, '{en,categories_tagline}', '"Each category brings together collections that share a material, a technique or a story."')
  where id = 1 and translations #>> '{en,categories_tagline}' = 'Every collection is a family of pieces that share a material, a technique or a story.';

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
alter table public.categories       enable row level security;
alter table public.collections      enable row level security;
alter table public.site_settings    enable row level security;
alter table public.contact_messages enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.collections, public.site_settings to anon, authenticated;
grant insert, update, delete on public.categories, public.collections to authenticated;
grant update on public.site_settings to authenticated;
grant select, update, delete on public.contact_messages to authenticated;
-- Visitors may only supply these three columns when sending a message.
grant insert (name, email, message) on public.contact_messages to anon, authenticated;

drop policy if exists "categories are public" on public.categories;
create policy "categories are public" on public.categories for select using (true);
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "collections are public" on public.collections;
create policy "collections are public" on public.collections for select using (true);
drop policy if exists "admins manage collections" on public.collections;
create policy "admins manage collections" on public.collections for all to authenticated
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
