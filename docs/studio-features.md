# BAG Studios website features

Owner: boringarcadestudios@gmail.com. Only the studio website and domain are in scope.

Keep the existing HTML pages, dark background, warm white headings, grey descriptions,
red buttons, images and navigation. Add a contact form alongside the existing contact
card, and a compact newsletter form on Home and Blog.

## Blog publishing

An unlisted `/admin.html` page uses Supabase email/password authentication. Only the
confirmed studio email may access administration. Credentials and sessions are never
written to browser storage. The administrator can create, edit, preview, publish,
unpublish and delete posts. Posts contain a title, slug, category, excerpt, optional
HTTPS cover image and text with headings and lists. HTML in post content is escaped.
Published articles are rendered on the server at `/blog/<slug>` for search engines.
The existing Umeå article and blog card stay available if the database is unavailable.

## Contact and newsletter

Contact collects name, reply email, subject, message and privacy consent. The admin
can read and delete enquiries. Newsletter signup collects email and explicit consent;
subscribers can unsubscribe using an individual link, and the administrator can export
active subscribers with those links. This scope stores signups; it does not send
newsletter campaigns or claim to send confirmation emails.

Public writes go through Vercel functions with validation, same-origin checks,
honeypots and a persistent hourly rate limit. No public role can read enquiries,
subscribers or rate-limit data. A short privacy page explains the data being stored.

## Data and deployment

Use Supabase project `gucnfmmkjmjwtqakugsn`. Enable RLS on every table and explicitly
grant only published-post reads to public clients. Private data and all writes use a
server-only Supabase secret. Verify administrator sessions against Supabase Auth on
every admin request; never trust user-editable metadata for authorization.

Build static assets into `public/` so server source, SQL, tests, local environments and
documentation cannot be served. Keep Vercel functions outside that directory. Connect
the existing GitHub repository and `main` branch to the studio's Vercel project.

## Execution and verification

1. Add meaningful API authorization, validation, draft visibility and escaping tests;
   run them before the implementation to demonstrate failure.
2. Implement SQL setup, server routes and the isolated static build.
3. Add the forms, blog feed, article rendering and admin interface.
4. Run API tests and browser checks on desktop and mobile, including failure states.
5. With the studio connection available, apply SQL, configure private environment
   variables, create the owner Auth user, test real writes and RLS, and deploy.

The studio Supabase connection is active and the schema is applied. Production and
Preview environment variables are configured; server secrets remain hidden.

Verified: 13 API/rendering tests; admin browser workflow with simulated HTTP;
desktop and mobile layouts; real production contact, signup and unsubscribe writes;
anonymous admin rejection; server source exclusion; sitemap, article 404 and HTTPS
redirects. Temporary submission records were deleted. Database security advisors
reported no findings. Live owner authentication/publishing awaits the initial Auth user.

GitHub is connected to the studio Vercel project. The repository is
`BAG-Studios/BAG-Studios-Website`, renamed from `BAG-Studios/BAG-Studios`.
The production branch is `main`.

Website login setup:

- In the studio project's Supabase Authentication Users screen, create the website
  Auth user `boringarcadestudios@gmail.com` with a privately chosen password and
  confirmed email. The Supabase dashboard account is separate from a website Auth user.
  Sign into `/admin.html` with that website login and verify a real draft/publish cycle.

Never substitute a personal project, expose credentials, or claim local tests prove
live database access. This implementation records newsletter signups and exports;
campaign email delivery is not included or silently simulated.
