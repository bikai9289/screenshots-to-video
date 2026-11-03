/** Scanner / WordPress / tooling probes — short-circuit before app SSR. */

const SCANNER_PROBE_PATH_RE =
  /^\/(?:\.env(?:\.[\w.-]+)?$|\.git(?:\/|$)|wp-admin(?:\/|$)|wp-content(?:\/|$)|wp-includes(?:\/|$)|wp-login\.php$|wp-cron\.php$|xmlrpc\.php$|wordpress(?:\/|$)|phpmyadmin(?:\/|$)|adminer(?:\.php)?$|pma(?:\/|$)|cgi-bin(?:\/|$)|vendor\/phpunit(?:\/|$)|server-status$|server-info$|actuator(?:\/|$)|_ignition(?:\/|$)|telescope(?:\/|$)|horizon(?:\/|$)|debug\/default(?:\/|$)|\.aws(?:\/|$)|\.svn(?:\/|$)|\.hg(?:\/|$)|backup(?:\/|$)|dump(?:\/|$)|sql(?:\/|$)|db(?:\/|$)|database(?:\/|$)|phpinfo(?:\.php)?$|info\.php$|test\.php$|shell\.php$|eval-stdin\.php$|containers\/json$|(?:package|composer|tsconfig)\.json$)/i;

/** Sensitive file extensions never served by this app. */
const DANGEROUS_FILE_EXT_RE =
  /\.(?:php\d*|phtml|phar|asp|aspx|jsp|cgi|env|sql|bak|old|orig|save|swp|dist|tar|gz|tgz|zip|rar|7z|bz2|xz|pem|key|crt|p12|pfx|ini|cfg|conf|log|yml|yaml)$/i;

const BLOCKED_METHODS = new Set(['TRACE', 'TRACK']);

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'X-DNS-Prefetch-Control': 'on',
};

function isScannerProbePath(pathname: string) {
  if (SCANNER_PROBE_PATH_RE.test(pathname)) return true;
  if (DANGEROUS_FILE_EXT_RE.test(pathname)) return true;
  if (
    pathname.includes('..') ||
    pathname.includes('%2e') ||
    pathname.includes('%2E') ||
    pathname.includes('%00')
  ) {
    return true;
  }
  return false;
}

/** Return a block response for probes / TRACE; otherwise null. */
export function getProbeBlockResponse(req: Request): Response | null {
  if (BLOCKED_METHODS.has(req.method.toUpperCase())) {
    return new Response(null, { status: 405 });
  }

  let pathname = '/';
  try {
    pathname = new URL(req.url).pathname;
  } catch {
    return null;
  }

  if (!isScannerProbePath(pathname)) return null;

  return new Response(null, {
    status: 404,
    headers: {
      'Cache-Control': 'public, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}

/** Attach baseline security headers when missing. */
export function applySecurityHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(key)) {
      response.headers.set(key, value);
    }
  }
  return response;
}
