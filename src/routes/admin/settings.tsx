import { createFileRoute, Link } from '@tanstack/react-router';

/**
 * Admin Settings UI removed — configure providers/secrets via environment
 * variables or `wrangler secret put` only.
 */
function AdminSettingsDisabledPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Settings via environment only</h1>
      <p className="text-muted-foreground leading-relaxed">
        The Admin Settings panel (General / Auth / Payment / Email / Storage /
        AI / Analytics / Ads / Customer Service / Notify / Custom) has been
        disabled. Configure via environment variables or Cloudflare Wrangler
        secrets — see <code className="text-sm">.env.example</code>. Database
        config rows no longer override non-empty env values.
      </p>
      <p className="text-muted-foreground text-sm">
        Users, payments, and other admin pages remain available.
      </p>
      <Link to="/admin" className="text-primary inline-flex underline">
        Back to admin overview
      </Link>
    </div>
  );
}

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettingsDisabledPage,
});
