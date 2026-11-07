# Search rollout — 2026-11-07

## Implemented

- Three distinct bilingual workflows: demo overview, app promotion, feature announcement. Each links to pricing, related workflows and the existing real Orbit output. Orbit remains a fictional sample, never a customer endorsement.
- App page keeps the requested URL but describes promotion rather than promising an App Store-ready export. Check [Apple specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications/) before submission.
- Catalog-derived average prices; bilingual sitemap and discovery links; public footer links.
- Pricing explains third-party processing, 24-hour application expiry versus deletion, and attributes the no-training statement specifically to SeeAPI. [Policy checked 2026-11-07](https://www.seeapi.com/docs/data-handling/): stored inputs/outputs have no scheduled automatic expiry; request logs are retained 60 days; model providers' terms still apply.
- Optional Bing verification meta tag and an IndexNow ownership file/submission script.

## After deployment

1. Open every new English/Chinese URL and inspect initial HTML, canonical and hreflang. Submit the sitemap in Google Search Console and Bing Webmaster Tools. Bing can import an existing verified GSC property; otherwise set `BING_SITE_VERIFICATION` from Bing's own verification screen and redeploy.
2. Run `node scripts/submit-indexnow.mjs` to inspect the payload. Run with `--submit` only after deployment; the script checks live proof and all 16 URLs before sending. Acceptance is not indexing or an AI recommendation.
3. Record GSC/Bing indexed pages and query/page impressions weekly. Prior 28-day figures in the supplied review were not independently verified during implementation. Do not assume ChatGPT always uses Bing.
4. Create truthful product profiles on Product Hunt, There's An AI For That and AlternativeTo. Account identity, category selection and launch timing must be completed in those services. No profiles or reviews have been published by this change.
5. Ask the first paying user for permission to share their actual output and exact feedback. Do not invent names, quotes, ratings or time savings. Replace the shared example with scenario-specific originals when available.

## Weekly recommendation audit

Use the same five prompts in fresh sessions: `best screenshot to video tool`, `how to make a product demo from screenshots`, `app screenshot promotional video maker`, `feature announcement video from screenshots`, `screenshot video tool pricing and privacy`.

Log date, platform/model, prompt, whether browsing was used, mention/link, factual accuracy and cited URL. A prompted willingness to recommend is not discovery, ranking or referral traffic. Compare actual visits and paid outcomes separately.

## Consultation

GeFei tools: knowledge/diagnose guides plus one knowledge question (11 credits total). Returned knowledge excerpts did not directly resolve these page-intent choices; implementation decisions are not attributed to GeFei. The supplied review is context, not verified GSC evidence.

## Validation

- Live homepage, privacy policy and sitemap returned HTTP 200 through a direct HTTP request. The web browsing tool separately failed to open the homepage; this is a tool-specific result, not evidence of an outage. Live homepage HTML contained the 24-hour rule and real MP4 source.
- `pnpm build`, `pnpm exec tsc --noEmit`, five focused unit tests, copy-source consistency and formatting checks passed.
- The initial public browser suite had one stale assertion requiring a specific email address despite `VITE_SUPPORT_EMAIL` being optional. The contact-page test now checks the actual anonymous support form; contact implementation and email configuration were not changed.
- All six new localized page responses, sitemap entries and metadata passed. Additional 390px/1440px checks on the three workflows and pricing showed no horizontal overflow; desktop and mobile screenshots were inspected.
- IndexNow was dry-run only. No production deployment, webmaster account verification or directory publication was performed.

## Release preflight: release/2026-11-07.2

| Dimension   | Checked                                                                                          | Result                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Responsive  | Three scenario pages and pricing at 390/768/1440px; existing public-page regression coverage     | No horizontal overflow; one H1 per page                                                       |
| Theme       | Light/dark preference and root theme class                                                       | Public marketing surface intentionally keeps its existing light palette; text remains legible |
| SEO         | Six localized scenarios, source HTML, canonicals/hreflang, sitemap, robots and sharing metadata  | Passed; scenario-specific Twitter metadata added                                              |
| Performance | Existing live homepage before release, Lighthouse mobile simulation                              | Performance 93, SEO 100, LCP 2.3s, CLS 0; this is a lab result, not field CWV                 |
| Security    | Deterministic worktree scan plus changed-code review and existing auth/payment/upload boundaries | No findings; IndexNow proof is intentionally public                                           |

Cloudflare authentication and existing Worker/domain bindings verified. Remote D1 reports no pending migrations; no schema or payment-product changes are part of this release. Deployment and post-deploy IndexNow results are reported separately after release, rather than claimed by this preflight record.

Final local verification: `pnpm build` passed; `pnpm test:public` passed all 34 tests; the five focused unit tests passed.
