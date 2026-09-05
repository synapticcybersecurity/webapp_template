/**
 * Email-domain helpers for tenant auto-join.
 *
 * Deliberately conservative. `extractBaseDomain` returns the registrable
 * domain only for simple two-label suffixes and a short list of known
 * multi-label public suffixes. Anything it is unsure about it returns
 * verbatim, because the failure mode of guessing wrong is joining a user to
 * the wrong tenant — worse than not auto-joining at all.
 *
 * A full Public Suffix List would be more accurate. That is a dependency and a
 * data-refresh obligation; for a template the explicit list below is the
 * honest trade, and OrganizationDomain rows can always be written exactly.
 */

/**
 * Multi-label public suffixes common enough to matter. Under these, the
 * registrable domain has three labels (e.g. `bbc.co.uk`), not two.
 */
const MULTI_LABEL_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'co.jp',
  'or.jp',
  'ne.jp',
  'ac.jp',
  'com.au',
  'net.au',
  'org.au',
  'edu.au',
  'gov.au',
  'co.nz',
  'com.br',
  'com.mx',
  'co.za',
  'co.in',
  'com.sg',
]);

/** Lowercased domain part of an email address, or null if unparseable. */
export function extractDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return null;
  }
  return domain;
}

/**
 * Registrable domain for an email address.
 *
 * `alice@mail.corp.example.com` -> `example.com`
 * `bob@dept.bbc.co.uk`          -> `bbc.co.uk`
 */
export function extractBaseDomain(email: string): string | null {
  const domain = extractDomain(email);
  if (!domain) return null;

  const labels = domain.split('.');
  if (labels.length <= 2) return domain;

  const lastTwo = labels.slice(-2).join('.');
  if (MULTI_LABEL_SUFFIXES.has(lastTwo)) {
    return labels.slice(-3).join('.');
  }
  return lastTwo;
}

/**
 * Whether an email is in the comma-separated bootstrap admin allow-list.
 *
 * This is how the very first administrator exists on a fresh deployment:
 * without it, every user lands banned pending approval and there is nobody
 * with the authority to approve them.
 */
export function isBootstrapAdmin(email: string, adminEmails?: string): boolean {
  if (!adminEmails) return false;
  const allowed = adminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
