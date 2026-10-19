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

External gates: the project-scoped Supabase MCP connection must load in Codex; the
studio Vercel account must authorize its GitHub connection. Never substitute a
personal project, expose credentials, or claim local tests prove live database access.
