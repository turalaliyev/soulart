# SoulArt

A website for a collection of art and crafts, with an admin panel. Built with React, Vite and Supabase, and hosted on Vercel.

- Website: `/`, `/about`, `/collections`, `/collections/:slug`, `/products/:slug`, `/contact`
- Admin panel: `/admin`

## Try it locally

```
npm install
npm run dev
```

Open the address it prints, usually http://localhost:5173. Without Supabase keys you get preview mode, with placeholder art and an admin panel that accepts any login. Changes in preview mode disappear when you refresh, and production builds don't include any of the preview content.

## Connect Supabase

1. Create a project at https://supabase.com/dashboard. Save the database password somewhere safe.
2. Open **SQL Editor > New query**, paste all of `supabase/schema.sql`, and click **Run**. You can safely run it again later.
3. Create your admin login: **Authentication > Users > Add user > Create new user**. Enter an email and password and tick **Auto Confirm User**.
4. Give that login admin rights. In the SQL Editor, run this with your email:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

   Repeat steps 3 and 4 for each extra admin.
5. Close public sign-ups: under **Authentication > Sign In / Providers**, turn off **Allow new users to sign up**. Accounts outside the admin list can't change anything anyway, so this just keeps strangers out of your user list.
6. Copy your keys. Click **Connect** at the top of the dashboard, or open **Project Settings > API Keys**. You need the Project URL and the **Publishable** key (`sb_publishable_...`, or the legacy `anon` key on older projects). Don't use the secret or `service_role` key: the browser can read anything prefixed `VITE_`.
7. Copy `.env.example` to `.env.local` in this folder and fill it in:

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_...
   ```

8. Restart `npm run dev`, open `/admin`, and sign in. The preview banner should be gone.

## Publish on Vercel

1. Put the code on GitHub. Create an empty private repository, then run:

   ```
   git init
   git add .
   git commit -m "SoulArt website and admin panel"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/soulart.git
   git push -u origin main
   ```

   `.gitignore` keeps `.env.local` out of the repository.
2. At https://vercel.com/new, import the repository. Vercel detects Vite, so leave the build settings alone.
3. Before deploying, open **Environment Variables** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` with the same values as `.env.local`.
4. Click **Deploy**. Your admin panel is at `https://your-project.vercel.app/admin`.

After this, each `git push` to `main` redeploys the site. If you change an environment variable, redeploy from the Vercel dashboard, because Vite reads these values at build time. To use your own domain, go to **Project > Settings > Domains**.

## Fill in the content

1. Under **Site content**, replace the starter text and upload the hero, About, Collections and Contact images. Also set your real contact email: the starter address `hello@soulart.com` is a placeholder.
2. Under **Collections**, create your collections.
3. Under **Products**, add products. Each one needs at least one image, and the first image is the cover. Tick **Show on the home page** for the pieces you want under Selected Works. If you tick none, the home page shows the most recent ones.

## Languages

The site runs in Azerbaijani (default), Russian and English:

- Azerbaijani: `/about`
- Russian: `/ru/about`
- English: `/en/about`

Visitors switch with AZ / RU / EN in the header. A visitor who picks Russian or English gets it again the next time they open the home page. Shared links keep their own language.

In the admin panel, the switch at the bottom of the sidebar changes the panel's own language. The tabs at the top of each form choose which language you are editing:

- Azerbaijani is the main version, and each collection and product needs a name in it. The page address comes from that first name and stays the same if you rename the item later.
- Russian and English are optional. Where you leave a field blank, the website shows the Azerbaijani text.
- An orange dot on a tab means that language still needs translating.
- Images, email, phone and social links are shared across languages.

To change fixed text such as button labels, edit `src/site/strings.ts` (website) or `src/admin/i18n.tsx` (admin panel).

**Upgrading a database made before languages were added:** run all of `supabase/schema.sql` again in the SQL Editor *before* deploying the new code. It adds the translation columns and keeps your content. Text already in your collections and products counts as Azerbaijani.

## Good to know

- **Contact messages** go to **Messages** in the admin panel. Nothing emails you when one arrives, so check the panel. Email alerts need a sending service such as Resend.
- **Images** shrink to 2400 px WebP in the browser before upload, which helps you stay inside the free storage quota. Upload JPG, PNG, WebP or AVIF. Convert iPhone HEIC photos to JPG first.
- **Forgotten admin password:** reset it in Supabase under **Authentication > Users**.
- **Free Supabase projects** pause after about a week without activity, which takes the site down until you restore the project in the dashboard. Check Supabase's current plan terms before you launch.
- **Search and link previews:** this is a single-page app, so Google can index it, but social networks show the same generic preview for all pages.

## Project layout

```
supabase/schema.sql   Tables, security rules and image storage
src/lib/              Data access (Supabase, plus the preview-mode stand-in)
src/site/             Public website
src/admin/            Admin panel, loaded as a separate bundle
src/demo/             Placeholder art for preview mode only
```
