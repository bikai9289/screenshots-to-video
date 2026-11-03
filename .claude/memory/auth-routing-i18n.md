# Auth, routing and i18n

- Login success returns to the page that initiated auth; callback URLs must preserve the intended generation flow.
- For homepage quick generation, pass the draft through auth, navigate to the locale-aware workspace route, then remove consumed `prompt/model/auto/...` parameters so the canonical URL is `/workspace/...`.
- Locale switching uses Paraglide `setLocale`; it must localize the current URL, not force the homepage. Internal links remain locale-free and use the project navigation wrapper.
- Keep route files locale-free; `/zh` is applied by router rewrite/runtime.
- Add every translation key to both `messages/en.json` and `messages/zh.json`; avoid hardcoded backend/user-facing errors.
