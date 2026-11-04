export const AUTH_SECRET_PLACEHOLDER =
  'shipany-dev-secret-change-in-production';

// Isomorphic env access:
// - Public (client-visible) vars are VITE_-prefixed and read from
//   import.meta.env (statically injected into the client bundle by Vite).
// - Server-only vars (secrets) are read from process.env and resolve to ''
//   in the browser — they never reach the client bundle.
const metaEnv: Record<string, string | undefined> =
  (import.meta as any).env ?? {};
const procEnv: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {};

const publicEnv = (key: string) => metaEnv[key] ?? procEnv[key];

export const envConfigs: Record<string, string> = {
  // App (public)
  app_url: publicEnv('VITE_APP_URL') ?? 'http://localhost:3000',
  app_name: publicEnv('VITE_APP_NAME') ?? 'Screenshots to Video',
  app_description:
    publicEnv('VITE_APP_DESCRIPTION') ??
    'Turn product screenshots into demo and launch videos. Paid access required.',
  app_logo: publicEnv('VITE_APP_LOGO') ?? '/logo.png',
  support_email: publicEnv('VITE_SUPPORT_EMAIL') ?? '',

  // Database
  database_url: procEnv.DATABASE_URL ?? '',
  database_auth_token: procEnv.DATABASE_AUTH_TOKEN ?? '',
  database_provider: procEnv.DATABASE_PROVIDER ?? 'sqlite',
  db_schema: procEnv.DB_SCHEMA ?? 'public',
  db_singleton_enabled: procEnv.DB_SINGLETON_ENABLED ?? 'false',
  db_max_connections: procEnv.DB_MAX_CONNECTIONS ?? '1',

  // Auth
  auth_url: procEnv.AUTH_URL ?? publicEnv('VITE_APP_URL') ?? '',
  auth_secret: procEnv.AUTH_SECRET ?? '',

  // Payment - Stripe
  stripe_secret_key: procEnv.STRIPE_SECRET_KEY ?? '',
  stripe_publishable_key: procEnv.STRIPE_PUBLISHABLE_KEY ?? '',
  stripe_signing_secret: procEnv.STRIPE_SIGNING_SECRET ?? '',
  // Enable flags (admin Settings UI removed — set via env / wrangler secrets)
  stripe_enabled:
    procEnv.STRIPE_ENABLED ?? (procEnv.STRIPE_SECRET_KEY ? 'true' : ''),
  select_payment_enabled: procEnv.SELECT_PAYMENT_ENABLED ?? '',
  default_payment_provider: procEnv.DEFAULT_PAYMENT_PROVIDER ?? 'stripe',
  creem_enabled: procEnv.CREEM_ENABLED ?? '',
  waffo_enabled: procEnv.WAFFO_ENABLED ?? '',
  paypal_enabled: procEnv.PAYPAL_ENABLED ?? '',
  alipay_enabled: procEnv.ALIPAY_ENABLED ?? '',
  wechat_enabled: procEnv.WECHAT_ENABLED ?? '',

  // Payment - PayPal
  paypal_client_id: procEnv.PAYPAL_CLIENT_ID ?? '',
  paypal_client_secret: procEnv.PAYPAL_CLIENT_SECRET ?? '',
  paypal_webhook_id: procEnv.PAYPAL_WEBHOOK_ID ?? '',
  paypal_environment: procEnv.PAYPAL_ENVIRONMENT ?? 'production',

  // Payment - Alipay
  alipay_app_id: procEnv.ALIPAY_APP_ID ?? '',
  alipay_private_key: procEnv.ALIPAY_PRIVATE_KEY ?? '',
  alipay_public_key: procEnv.ALIPAY_PUBLIC_KEY ?? '',
  alipay_notify_url: procEnv.ALIPAY_NOTIFY_URL ?? '',

  // Payment - WeChat Pay
  wechat_app_id: procEnv.WECHAT_APP_ID ?? '',
  wechat_mch_id: procEnv.WECHAT_MCH_ID ?? '',
  wechat_api_v3_key: procEnv.WECHAT_API_V3_KEY ?? '',
  wechat_private_key: procEnv.WECHAT_PRIVATE_KEY ?? '',
  wechat_serial_no: procEnv.WECHAT_SERIAL_NO ?? '',
  wechat_notify_url: procEnv.WECHAT_NOTIFY_URL ?? '',
  wechat_platform_cert: procEnv.WECHAT_PLATFORM_CERT ?? '',

  // Email - Resend
  resend_api_key: procEnv.RESEND_API_KEY ?? '',
  resend_sender_email:
    procEnv.RESEND_SENDER_EMAIL ?? procEnv.RESEND_EMAIL_FROM ?? '',

  // Storage - S3/R2 (general public/media storage)
  storage_endpoint: procEnv.STORAGE_ENDPOINT ?? '',
  storage_region: procEnv.STORAGE_REGION ?? 'auto',
  storage_access_key: procEnv.STORAGE_ACCESS_KEY ?? '',
  storage_secret_key: procEnv.STORAGE_SECRET_KEY ?? '',
  storage_bucket: procEnv.STORAGE_BUCKET ?? '',
  storage_public_domain: procEnv.STORAGE_PUBLIC_DOMAIN ?? '',
  inline_image_max_kb: procEnv.INLINE_IMAGE_MAX_KB ?? '5120',

  // Storage keys used by modules/storage (r2_* naming from ShipAny)
  r2_access_key: procEnv.R2_ACCESS_KEY ?? procEnv.STORAGE_ACCESS_KEY ?? '',
  r2_secret_key: procEnv.R2_SECRET_KEY ?? procEnv.STORAGE_SECRET_KEY ?? '',
  r2_account_id: procEnv.R2_ACCOUNT_ID ?? '',
  r2_endpoint: procEnv.R2_ENDPOINT ?? procEnv.STORAGE_ENDPOINT ?? '',
  r2_bucket_name: procEnv.R2_BUCKET_NAME ?? procEnv.STORAGE_BUCKET ?? '',
  r2_domain: procEnv.R2_DOMAIN ?? procEnv.STORAGE_PUBLIC_DOMAIN ?? '',
  r2_upload_path: procEnv.R2_UPLOAD_PATH ?? 'uploads',

  // AI / screenshots product
  seeapi_api_key: procEnv.SEEAPI_API_KEY ?? '',
  screenshots_bucket: procEnv.SCREENSHOTS_STORAGE_BUCKET ?? '',
  // OpenAI / Anthropic intentionally omitted from env fallbacks (ambient key risk).
  replicate_api_token: procEnv.REPLICATE_API_TOKEN ?? '',

  // Auth toggles (env-only; admin Settings UI disabled)
  email_auth_enabled: procEnv.EMAIL_AUTH_ENABLED ?? 'true',
  email_verification_enabled: procEnv.EMAIL_VERIFICATION_ENABLED ?? '',
  google_auth_enabled: procEnv.GOOGLE_AUTH_ENABLED ?? '',
  google_one_tap_enabled: procEnv.GOOGLE_ONE_TAP_ENABLED ?? '',
  github_auth_enabled: procEnv.GITHUB_AUTH_ENABLED ?? '',

  // Google OAuth (server-only secret + client id used by auth / One Tap)
  google_client_id: procEnv.GOOGLE_CLIENT_ID ?? '',
  google_client_secret: procEnv.GOOGLE_CLIENT_SECRET ?? '',

  // Analytics / ads / GSC (env wins over DB via getAllConfigs)
  google_analytics_id: procEnv.GOOGLE_ANALYTICS_ID ?? '',
  plausible_domain: procEnv.PLAUSIBLE_DOMAIN ?? '',
  plausible_src: procEnv.PLAUSIBLE_SRC ?? '',
  adsense_code: procEnv.ADSENSE_CODE ?? '',
  google_site_verification: procEnv.GOOGLE_SITE_VERIFICATION ?? '',

  // Locale (public)
  locale: publicEnv('VITE_DEFAULT_LOCALE') ?? 'en',
};
