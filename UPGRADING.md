# Upgrading an existing project

## 2026-11-07: Duration-based video credits (migration required)

- Apply `drizzle/sqlite/0001_previous_anthem.sql` before deploying credit-aware code on D1/SQLite. It only adds `screenshot_credit_allocation` and its indexes; it does not rewrite historical orders or tasks. Review the SQL before production application. Development schema was synced using `db:push`. PostgreSQL/MySQL templates include the matching table; generate a migration for that dialect before upgrading those deployments.
- New immutable product IDs sell $3.90/1, $9.90/3, $19.90/6, $29.90/10 video credits. The server catalog remains authoritative. Old screenshot product IDs cannot start new checkouts but still settle in-flight purchases and retain 1/3/5 legacy renders at any supported duration. Do not edit the entitlement counts attached to either generation of IDs.
- Account responses add `remainingCredits` and `legacyRenders`; `remainingRenders` remains a legacy-only alias. Studio requires 1/2/3 video credits for 5/10/15 seconds. Legacy renders are consumed first. Video credits do not grant generic AI credits.
- The public config endpoint caches filtered public results at the edge for 60 seconds. Database-check errors are HTTP 503/no-store, not cached false availability; the pricing UI allows checkout attempts while showing the unknown state. Checkout still validates the live server catalog and configuration.
- Stripe currently uses dynamic `price_data`, so there are no fixed historical price IDs to archive. Versioned product IDs and server-generated `video_credits` metadata identify this change; metadata cannot grant rights. Existing payment/order idempotency stays in place.
- Unknown submissions recover only with the exact same provider idempotency key/body. Confirmed failed tasks are not automatically restarted as a fresh generation. Never remove the allocation table during rollback. Once new packs have been purchased, roll forward or use a compatible credit-aware build; older code cannot service their balances.

## 2026-11-07: Scenario pages and search submission

- Three bilingual scenario pages are linked from the footer, sitemap and public discovery files. App promotion does not promise App Store submission compliance. Pricing shows rounded per-render averages and attributed provider privacy facts; the paid model is unchanged.
- Optional `BING_SITE_VERIFICATION` emits Bing's `msvalidate.01` meta tag. Set it only if using HTML verification. No schema changes are required.
- Deploy the public IndexNow proof before running `node scripts/submit-indexnow.mjs --submit`; without the flag the script only previews the payload. See `docs/seo-rollout-2026-11-07.md` for remaining external setup and measurement.

## 2026-11-07: Tagged production releases

- Deploy with `pnpm cf:deploy --release release/<version>` after committing changes and creating an annotated release tag on HEAD. The runner rejects missing tags, mismatched commits and dirty working trees, and checks again after building.
- Cloudflare version metadata records the release tag and full Git commit. Production environment files and Worker secrets remain separate from Git tags. Push release tags to origin for shared recovery; never move an existing release tag.

## 2026-11-07: Environment-configured social authentication

- Authentication routes now use merged environment and database settings, so Google and GitHub credentials supplied through Worker secrets are registered correctly. Existing environment values retain precedence; no migration or new variables are required.
- Sign-in and sign-up pages now display a localized failure message when social authentication fails instead of silently ignoring the error.

## 2026-11-05: AI referral attribution

- Visit attribution retains dotted UTM values such as `chatgpt.com` and recognizes exact known AI source domains even without a referrer. Explicit non-AI campaign sources and `internal_test` retain precedence over referrers; campaign metadata alone no longer hides an AI referrer.
- Anonymous visits still use the configured GA/Plausible integration for aggregate analytics. Product events remain authenticated; browser attribution is retained and reported once after login. UTM tags and referrers are attribution hints, not verified evidence of an AI recommendation. Existing stored events are not rewritten. No database or environment changes are needed.

## 2026-11-05: Public footer and sharing metadata

- Footer language links now navigate directly to the other language of the current page, including query and fragment, and work without JavaScript. Legal links point directly to canonical paths; existing aliases remain available.
- Pricing headings include the product name in both languages. Pricing, contact and static legal pages emit their canonical URL as `og:url`, including localized URLs and aliases. No database or environment changes are required.

## 2026-11-04: Public product facts and crawler discovery

- `llms.txt` and `llms-full.txt` now share current catalog facts and distinguish anonymous support from account-required generation. Full facts add original example links, billing, storage and limitations. These files do not guarantee AI search inclusion or recommendation.
- Robots groups explicitly include OAI-SearchBot and Claude-SearchBot and consistently exclude localized private paths. Search crawlers can continue reading Studio's noindex tag; public training access remains allowed. Authentication remains the privacy boundary.
- English and Chinese FAQ now state actual upload/output limits, preview behavior, failed-render handling and retention rather than deferring known facts to Studio.

## 2026-11-04: Public contact, account entry and longer examples

- Contact inputs wait for hydration before becoming editable, preventing early typing from being lost on slower connections.

- Public headers expose Log in / My videos (also in the mobile menu) and the homepage states the supported 5/10/15-second durations. New 10- and 15-second generated examples replace the engineering sample, with source screenshots and honest labelling.
- `/api/contact` accepts bounded, same-origin anonymous enquiries, with a honeypot and IP limits including the existing Durable Object limiter. Deployments need that binding. Enquiries are stored atomically in the existing admin ticket inbox under an API-type system account; no visitor account is registered and no schema migration is needed.
- `VITE_SUPPORT_EMAIL` is the fixed notification destination. Resend uses the existing `RESEND_API_KEY` and `RESEND_SENDER_EMAIL`; request IDs deduplicate both storage and provider requests. Email failure retains the enquiry in the admin inbox. Replies can be sent to the validated visitor Reply-To address; no automatic email is sent to unverified visitor addresses.
- Domain Email Routing for `support@screenshotstovideo.com` is configured separately from Resend sending; it forwards to the owner's verified Gmail. Application configuration and secrets remain environment-based.

## 2026-11-04: Cold Worker locale isolation

- The server initializes Paraglide AsyncLocalStorage synchronously before accepting requests. This prevents concurrent cold requests from replacing each other's locale context and intermittently redirecting Chinese pages to English.

## 2026-11-04: Cross-platform Cloudflare deploy

- `pnpm cf:deploy` uses a Node runner rather than POSIX shell syntax, including env-file loading, the Cloudflare build, thin-entry finalization, and Wrangler deployment. It requires Node 22, matching the project environment. Secret values are never passed as command arguments.

## 2026-11-04: Screenshot maintenance in Worker scheduled events

- Cloudflare builds now finalize a thin `worker-entry.mjs` handler entry. This prevents Nitro's internal shared constants/tables from being interpreted as Worker handlers. Keep deployment pointed at the generated Wrangler config; do not deploy `index.mjs` directly.

- Existing Cloudflare cron triggers now also recover pending screenshot renders and clean up unused expired inputs. The CLI shares the same implementation and retains preview-by-default behavior. No database migration or new secret is required.
- Deploy the new plugin before considering cron maintenance effective. Uncertain tasks retain their reserved render and referenced inputs. Follow `docs/screenshots-operations.md` to inspect run summaries.

## 2026-11-04: Pricing metadata and purchase availability

- The homepage includes an actual five-second generated test output, separate from the illustrative motion preview. See `docs/demo-media.md` for provenance.

- Public pricing now shows supported output settings and screenshot limits with an AI fidelity notice. Privacy pages link to the verified SeeAPI data-handling guide and Stripe policy.
- Set `VITE_SUPPORT_EMAIL` to a monitored public mailbox and rebuild to enable pre-sales email contact without login. No admin account address is exposed by default.

- Pricing uses separate English and Chinese search metadata, without changing the visible heading. Regenerate Paraglide messages with the normal build.
- Pricing now distinguishes checking availability, config request failure (with retry), and confirmed purchase unavailability. Initial SSR markup no longer incorrectly declares that purchasing is closed. Payment configuration and settlement behavior are unchanged.

## 2026-11-03: Product branding

- Replace the template favicon, logo, touch icon and social preview with the Screenshots to Video identity. Icon links include a version to refresh cached browser icons.
- Product names in both locales and legacy page fallbacks now match the product. Unpublished template blog posts and the unused template badge were removed. Internal admin skill paths, protocol names and historical product IDs remain compatible.
- Install setup uses Node rather than POSIX shell commands, including on Windows. It creates the data directory and only copies a schema when one is missing.

## 2026-11-03: Screenshots to Video product implementation

- Auth no longer trusts arbitrary request `Origin` values. Same-origin requests and explicitly configured `AUTH_TRUSTED_ORIGINS` remain allowed. `pnpm test:auth:real` verifies actual registration/session/login and paid-access denial against a fresh isolated database, including rejection of an untrusted origin; it requires a current production build and free local port 3002.

- Database JS CLIs are launched through Node instead of Windows `.cmd` shims. Migration output is separated by dialect under `drizzle/<dialect>/`; preserve and move existing matching history before generating new migrations. The SQLite baseline is for fresh databases only: see `docs/database-migration.md`.

- Legacy saved-order settlement is available as `settleCheckoutOrder`; it rechecks current order state and atomically links subscriptions and grants credits. Existing provider subscription numbers are preserved.
- Subscription renewal writes now use `atomic()` with a billing-period guard, so retries with different transaction identifiers for one period cannot grant twice. SQLite and local D1 batch verification both pass the 11 atomic scenarios.
- `closeDb` now closes tracked SQLite/Turso clients and clears the cached accessor. Windows payment regression tests use `pnpm test:payments`, which enables GC before disposing temporary native database handles.
- Local D1 verification is isolated from deployment configuration: `pnpm test:atomic:d1` runs 11 shared scenarios and `pnpm test:screenshots:d1` runs the 6 screenshot-pack scenarios using `tests/fixtures/wrangler.atomic.jsonc`.

- The public homepage and pricing now use the approved Screenshots to Video design. The original prototype remains under `designs/screenshots-to-video/`.
- New private-input and render-task tables (`screenshot_asset`, `screenshot_task`) are defined in all three schema templates. Development uses `pnpm db:setup` and `pnpm db:push`; production requires a generated and reviewed migration before applying it.
- New one-time USD products: `screenshot_video_single` (990 cents, 1 render), `screenshot_video_three` (1990 cents, 3 renders), `screenshot_video_five` (2990 cents, 5 renders). These grant no generic AI credits. Only paid matching orders with a positive recorded payment authorize renders.
- Configure SeeAPI, Stripe and a private R2 input bucket before enabling purchases. See `.env.example` and `docs/screenshots-api.md`. Configure a one-day lifecycle rule for `screenshots/` and disable public bucket access; application expiry is not proof of physical deletion.
- Root metadata no longer advertises a zero-price software offer or disables browser zoom. Public routes must supply their own canonical and alternate links.
- `apiUpload` supports multipart requests through the typed API client. `visit_attributed` is a new client event with English and Chinese timeline labels; attribution is advisory, not payment evidence.
- New verification: `pnpm test:ui` (running server required; `STV_BASE_URL` selects it), plus unit tests for provider contracts, upload boundaries, source attribution and atomic paid-render reservations.
- The inherited `/api/ai/generate` endpoint returns 410 for this product and the old public image/video generators redirect to Studio. Existing historical records remain intact; no generic gift balance authorizes the new paid workflow.

Read this when a project built from this template pulls newer template code.
Entries are newest first. Apply **every entry dated after the template version
the project last pulled**, oldest of those first.

## How to upgrade (every time)

1. **Find the baseline.** The last template commit the project took. Check
   `git log` for a `Template-sync:` trailer. If there isn't one, use the date of
   the last template pull.
2. **Bring the code over.** Merge or cherry-pick the template changes. When a
   file conflicts, keep the project's own changes, but re-apply the template's
   fixes inside it. Never keep the project's old copy of one service while
   taking the template's new copy of a service that depends on it, or the build
   breaks. Pairs that must move together are listed in each entry.
3. **Port the schema by hand.** `src/config/db/schema.ts` is the project's
   gitignored working copy, so pulling does not update it. Diff the template's
   `schema.<dialect>.ts` against the previous version and copy the new
   columns and tables into `schema.ts`.
4. **Apply the schema.**
   - Dev: `pnpm db:push`.
   - Production: `pnpm db:generate`, review the SQL, then `pnpm db:migrate`.
   - Cloudflare D1: re-run `/deploy-cloudflare`. Its Phase 4 generates and
     applies migrations.
5. **Register new permissions.** Run `pnpm admin:token sync-permissions`. It
   adds missing `admin.*` permission rows and never changes role assignments.
   Re-running `/deploy-cloudflare` does **not** do this, because it skips RBAC
   once roles exist. For remote D1, run the command against the local D1 copy
   and apply the `INSERT OR IGNORE` dump, the same way Phase 4.5 of that skill
   does. `super_admin` holds `*` and works without this step. You only need the
   new rows to grant new permissions to other roles.
6. **Install and verify.** Run `pnpm install`, `pnpm build`, and the
   `pnpm test:*` scripts. On Workers, also run `pnpm cf:build`.
7. **Record the sync.** End the upgrade commit with
   `Template-sync: <template sha>`.
8. **Hand over what code can't do.** Some items need the project owner:
   deployment env vars, running migrations on production, re-entering
   secrets. List every such unchecked item to the user when the upgrade is
   done, with the exact value to set (e.g. `PLAUSIBLE_SCRIPT_HOSTS=stats.example.com`,
   taken from the project's own settings), not just a link to this file.

When you change the template itself, add an entry here for anything an
existing project must act on. That covers schema, env vars, renamed or removed
exports, permission codes, and behavior that changes for end users.

---

## 2026-10-12: Activity timeline, product events, admin password reset

### Action required

- [ ] **Schema**: one new table, `user_event` (product events). Port it into
      `schema.ts` from the template for your dialect and apply it (steps 3–4).
      Nothing existing changes.
- [ ] **Permissions**: run step 5 to register `admin.passwords.reset`.
- [ ] **Self-hosted Plausible** (only if admin Settings → Analytics → Plausible
      script URL is a full URL on a host other than `plausible.io`): set the
      server env var `PLAUSIBLE_SCRIPT_HOSTS` to that host, e.g.
      `PLAUSIBLE_SCRIPT_HOSTS=stats.example.com`. On Workers put it in
      wrangler `vars`; on Docker/Node in the container or server env. A
      restart or redeploy is enough. Until it is set, the script does not load
      and saving that URL is refused. This replaces the build-time
      `VITE_PLAUSIBLE_SCRIPT_HOSTS` from 2026-10-11, which still works.
      Same-site proxy paths like `/js/script.js` need nothing.

### New, no action needed

- **Settings save** only validates fields that changed, so a stored
  Plausible URL that no longer passes no longer blocks saving the rest of
  the tab (e.g. the Google Analytics ID). The save error names the host to
  add.

- **Product events**: register kinds in `src/config/events.ts`. Record them
  with `recordEvent()` (`@/modules/events/service`) on the server, or with
  `track()` (`@/lib/track`) from the browser for kinds marked
  `client: true`. Browser reports go through `POST /api/events`, which is
  signed-in only, same-origin only, rate-limited, and capped to a small flat
  detail. `PricingTable` reports `plan_selected`. See AGENTS.md → "Product
  events".
- **Custom timeline sources**: `src/server/admin/timeline-sources.ts` plugs
  rows from the project's own tables into the timeline.
- User detail page: an "Activity" timeline (`users_timeline`,
  `GET /api/admin/users/timeline?userId=`, `users.read`). Built-in events
  come from existing tables, so existing history shows up right away: sign-up,
  orders created, paid, closed and refunded, subscriptions, credit grants and
  charges, AI tasks and tickets. It shows oldest first by default, with a
  toggle. Each row opens its record. The subscriptions and credits admin pages
  now accept `?search=`.
- Admin users list: "Set password" in the row menu
  (`users_set_password`, `POST /api/admin/users/password`). It needs the
  dedicated `admin.passwords.reset` code, which sits outside `admin.users.*`
  so the `admin` role does not pick it up; only `super_admin` has it unless you
  grant it (run step 5 to register the row). It signs the user out everywhere,
  adds an email/password login for OAuth-only users, refuses agent API keys,
  and refuses users whose roles exceed the caller's permissions. The row menu
  is also wider so labels no longer wrap.

---

## 2026-10-11: Atomic writes on D1, payment hardening, Agent API

### Action required

- [ ] **Schema** (additive only, nothing is dropped). Port these into
      `schema.ts`, then apply them (steps 3–4):
  - `user.type`: text, not null, default `'user'`. Agent accounts use `'api'`.
  - `apikey.type`: text, not null, default `'user'`. Agent keys use `'admin'`.
  - `apikey.expires_at`: nullable timestamp_ms. Null means the key never expires.
  - `order.refund_amount`, `order.refunded_at`, `order.refund_result`.
  - The new table `admin_execution`.
  - The `utm_*`, `referrer` and `country` columns on `user`, if the project
    predates them.
- [ ] **Alipay / WeChat Pay**: every product sold through them needs
      `cnyPriceInCents` in `src/config/pricing.ts`. Without it those providers
      now refuse the product. Previously a USD price was silently charged as CNY.
- [ ] **Dependencies**: run `pnpm install`. better-auth is now `^1.7.7`, and
      `seroval`/`seroval-plugins` are pinned to `1.6.8` through pnpm overrides.
- [ ] **Permissions**: run step 5. New codes include `admin.payments.refund`
      and the analytics and agent operations.
- [ ] **Self-hosted Plausible**: superseded by the 2026-10-12 entry (runtime
      `PLAUSIBLE_SCRIPT_HOSTS`, no rebuild). Old text kept for reference: if
      `plausible_src` is a full URL on a host
      other than `plausible.io` (e.g. `https://stats.example.com/js/script.js`),
      add that host to `VITE_PLAUSIBLE_SCRIPT_HOSTS` (comma-separated, exact
      hostnames) and **rebuild**. It is a `VITE_` var, so it is baked into the
      client bundle: put it in `.env.production` or the build environment.
      Setting it only at runtime (or only in wrangler `vars`) does not work.
      Without it the script silently stops loading; the stored setting is kept
      and works again once the host is listed. Also switch any `http://` URL to
      `https://`. Same-site proxy paths such as `/js/script.js` keep working
      with no change.
- [ ] **Initial role**: if `initial_role_name` in admin settings points at a
      role that grants admin access, point it at a non-admin role. Otherwise new
      signups get no role (see "Behavior changes").
- [ ] **Optional data repair (D1 deployments only).** Before this change, a
      write that failed halfway on D1 could leave an order marked paid with no
      credits. Find such orders:
  ```sql
  SELECT o.order_no, o.user_id, o.credits_amount FROM "order" o
  WHERE o.status = 'paid' AND o.credits_amount > 0
    AND NOT EXISTS (SELECT 1 FROM credit c
      WHERE c.order_no = o.order_no AND c.transaction_type = 'grant');
  ```
  Grant the missing credits from the admin console after checking each one.

### Breaking code changes (only if the project calls these directly)

- `deductForRefund(...)` was replaced by `planDeductForRefund(...)`, which
  returns `{ deducted, steps }`. Run the steps with `atomic()`.
- `consume(...)` no longer accepts `tx`. To charge credits together with your
  own writes, use `planConsume(...)` and put its `steps(q)` into the same
  `atomic()` call. `src/modules/ai-tasks/service.ts` shows how.
- `enforceMinIntervalRateLimit` no longer reads cookies. Passing `extraKey`
  now keys the limit to that value, the user id, **instead of** the IP.
- **Move these together:** `src/core/db/atomic.ts`,
  `src/modules/credits/service.ts`, `src/modules/payment/service.ts` and
  `src/modules/ai-tasks/service.ts`.

### Behavior changes users may notice

- **OAuth linking**: signing in with Google or GitHub no longer attaches to an
  existing password account whose email was never verified. This closes the
  pre-registration account takeover.
- **Endpoint secrets**: changing `openai_base_url`, `anthropic_base_url` or
  `r2_endpoint`, `telegram_api_base` or `notify_webhook_url` in settings now
  requires re-entering the matching secret.
- **Uploads**: at most 10 files and 20 MB per request, 10 MB per file. Only
  jpg/png/webp/gif/avif/heic are accepted. SVG is refused because it can carry
  script, and the stored extension comes from the MIME type, never the filename.
- **Rate limits**: requests are now limited per IP, and per user once signed in.
- **Initial role**: a role that grants admin access (`*`, `admin.*`) can't be
  set as `initial_role_name`, and signup also re-checks it. If an existing
  project already points `initial_role_name` at such a role, new users now get
  no role at all (an error is logged). Point it at a non-admin role.
- **Payment test amount**: `<provider>_test_amount` now applies only to users
  with `admin.access`. Everyone else pays the catalog price.
- **Credits**: `consume` rejects amounts that aren't positive integers, and
  fails with "insufficient credits" instead of under-deducting when the
  balance runs out mid-way.
- **Refunds**: refunding requires `admin.payments.refund`. Only `super_admin`
  holds it by default; the `admin` role no longer picks it up through
  `admin.payments.*`.
- **Admin order edit**: the status can only go from an unpaid order
  (`created`/`pending`) to `failed`. Paid, refunding and refunded states change
  only through checkout and refunds. Before this, moving a paid order back to
  pending let the next payment notification grant its credits again.
- **Checkout settlement** additionally requires `paid_at` to be empty and no
  existing grant for the order. New grants use `transaction_no =
grant_<orderNo>`, so the unique index allows one grant per order. Older
  rows keep their numeric transaction numbers.
- **Alipay / WeChat**: notifications are checked against the configured
  `app_id` / `mchid` and the order amount. Mismatches are rejected.
- **Embed IDs are validated**: `google_analytics_id`, `adsense_code`,
  `crisp_website_id`, `tawk_property_id`, `tawk_widget_id` must match their
  provider's format (see `src/lib/embed-ids.ts`), and `plausible_src` must be
  a same-site path or an https URL on `plausible.io` or on a host listed in
  the deployment env `PLAUSIBLE_SCRIPT_HOSTS` (since 2026-10-12; previously
  the build-time `VITE_PLAUSIBLE_SCRIPT_HOSTS`). Bad values are refused on save. Values already stored in the
  database that don't match are no longer rendered, so check these settings
  after upgrading.
- **Checkout return page**: after a successful payment the user now lands on
  `/settings/payments` by default (pricing block, `PricingTable`, and the
  checkout/callback fallbacks). If the project pointed it somewhere else on
  purpose, keep its own `callbackUrl`.
- **Admin search**: the search boxes on users, payments, subscriptions, credits,
  tickets and invite codes are case-insensitive on every database. They also
  match the account's email and name, and an exact user ID. Subscription search
  used to be ignored by the API; it now filters.

### New, no action needed

- `atomic()` / `guard()` in `src/core/db/atomic.ts`. See AGENTS.md
  → "Atomic writes".
- Admin Agent API (`/admin/agent`), the conversion funnel, overview KPIs and the
  `analytics_report` operation. See `docs/admin-agent.md`.
- `src/lib/sql-search.ts` for admin list search.
- `src/components/user-cell.tsx` (`UserCell`): avatar + name + email that
  links to `/admin/users/$id`. Payments, subscriptions, credits and tickets
  open it in a new tab.
- Admin users list: ID column with copy, effective roles column, and a
  `utm_source` filter (`users_sources` operation, `GET /api/admin/users/sources`,
  `users.read`). The subscriptions and credits list APIs now also return
  `userName` / `userImage`.

# Payment status checks and reconciliation (2026-11-04)

- No schema migration. Failed payment attempts use server-only `payment_attempt_failed` events in the existing user timeline, with deterministic IDs for replay protection. Only safe error codes are stored in the new attempt record, not card data or raw bank messages.
- Keep the four Checkout events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`. They now have application handlers, not just Dashboard subscriptions. Add `payment_intent.payment_failed` to the same endpoint to record individual rejected attempts immediately. Otherwise polling can capture the latest failure only, not every intermediate attempt.
- Restricted Stripe keys need Checkout Sessions read/list and PaymentIntents read for expanded error/status lookup, in addition to existing checkout/customer creation permissions. A permission/network error leaves orders unconfirmed and returns `PAYMENT_STATUS_UNAVAILABLE`; it never proves payment failure.
- Replace this Worker's daily trigger with a single `*/5 * * * *` trigger (no extra account cron slot). Payment checks process up to 20 pending screenshot-pack orders per run; daily storage jobs run only at 16:00 UTC from the same trigger. Larger backlogs take multiple runs. Provider error rows rotate without being marked failed.
- `/settings/payments` now shows payment-specific states and an owned-order check button. `POST /api/user/orders/check` accepts only `{orderNo}`, uses session ownership and IP/account limits, and does not create a charge. The original Checkout URL is only exposed to its owner, only for pending/retryable sessions and only on `https://checkout.stripe.com`.
- Existing payment success/amount validation remains the settlement authority. Timeouts are unknown, a declined attempt is retryable while Checkout is open, and terminal expiry/async failure cannot downgrade an already paid order. Test-mode sessions left in production cannot be queried using a live key; they remain unconfirmed rather than being guessed failed.

## 2026-11-10: Bounded screenshot submission recovery

- Apply `drizzle/sqlite/0002_furry_jean_grey.sql` before deploying this build on D1/SQLite/Turso. Review the migration before applying it in production. It adds `submission_attempts` and conservatively stops automatic replay of older reserved tasks that were already submitted, because their previous attempt count is unknown. It does not release their credits or delete tasks. Known provider tasks continue to be polled.
- PostgreSQL/MySQL schema templates include the same counter; generate and review the matching dialect migration before upgrading those deployments. Development uses `pnpm db:setup` and `pnpm db:push`.
- Each task permits at most 3 provider submission attempts, including the initial one. A durable atomic claim counts attempts before the network request, including concurrent callers and process crashes. Replays keep the original key and input. Once exhausted, reserved tasks report `SUBMISSION_LIMIT_REACHED` (4116); an unknown outcome retains its credit reservation for support reconciliation, while a confirmed terminal failure still releases it. Never reset the counter simply to retry an uncertain submission.
- Both homepages now link to all three existing scenario pages within the main content below the generated samples. FAQ and Studio messages explain the submission limit; no external indexing submission is performed by this change.
