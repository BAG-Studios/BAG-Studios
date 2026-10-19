# BAG Studios blog publishing

Owner: boringarcadestudios@gmail.com. Only the studio website and domain are in scope.
Repository: BAG-Studios/BAG-Studios-Website. Pushes to main deploy through Vercel.

The unlisted `/admin.html` uses Supabase email/password authentication. Only the
confirmed studio email can create, edit, preview, publish, unpublish and delete
posts. Sessions remain in memory. The editor is a visual article canvas with movable
heading, paragraph, list and image sections, cover captions, a side-image layout,
image crops and an optional closing section with buttons. Images can be picked from
existing studio assets or uploaded as JPEG, PNG or WebP files up to 2.5 MB. The
blog-media bucket serves images publicly; only the verified owner API can upload.
Articles store their layout in blog_posts.layout and preserve plain content for
older posts. The preview and published article use the same article-layout.js
renderer and post-article.css styles. All supplied text is escaped. Published
articles render on the server at `/blog/<slug>` and appear in the sitemap.
The existing static Umeå article remains available independently.

Supabase project: gucnfmmkjmjwtqakugsn. Blog posts use RLS. Public clients can only
read published posts whose publication date has passed. Writes require verified
owner authentication through Vercel's API. Server credentials stay private.

The contact form, newsletter signup, unsubscribe page, submission API handlers and
their admin sections were removed at the user's request. Existing database records
are not erased by this code change; retired tables remain private and unused.
The contact page retains its portrait, email address and phone details.

Static assets build into public/; server source, tests, SQL, docs and local environment
files are excluded. Run `npm test` for API/rendering checks. Run the optional
`tests/admin-browser.cjs` against `npm run dev` with Playwright available to test
the admin workflow with simulated HTTP responses.

To activate the website login, create a confirmed Supabase Auth user with the owner
email and a privately chosen password. This is separate from the dashboard account.
