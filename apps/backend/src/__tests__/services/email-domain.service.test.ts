import { describe, it, expect } from 'vitest';
import {
  extractDomain,
  extractBaseDomain,
  isBootstrapAdmin,
} from '../../services/email-domain.service.js';

describe('extractDomain', () => {
  it('extracts the domain part', () => {
    expect(extractDomain('alice@example.com')).toBe('example.com');
  });

  it('lowercases and trims', () => {
    expect(extractDomain('Alice@Example.COM ')).toBe('example.com');
  });

  it('uses the last @ so plus/quoted local parts do not confuse it', () => {
    expect(extractDomain('weird@local@example.com')).toBe('example.com');
  });

  it.each([
    ['no-at-sign', 'missing @'],
    ['@example.com', 'empty local part'],
    ['alice@', 'empty domain'],
    ['alice@localhost', 'no dot in domain'],
    ['alice@.com', 'leading dot'],
    ['alice@example.', 'trailing dot'],
  ])('returns null for %s (%s)', (email) => {
    expect(extractDomain(email)).toBeNull();
  });
});

describe('extractBaseDomain', () => {
  it('returns a two-label domain unchanged', () => {
    expect(extractBaseDomain('alice@example.com')).toBe('example.com');
  });

  it('strips subdomains down to the registrable domain', () => {
    expect(extractBaseDomain('alice@mail.corp.example.com')).toBe('example.com');
  });

  it('keeps three labels under a known multi-label suffix', () => {
    // Without this, dept.bbc.co.uk would collapse to `co.uk` and every UK
    // organization would auto-join the same tenant.
    expect(extractBaseDomain('alice@dept.bbc.co.uk')).toBe('bbc.co.uk');
    expect(extractBaseDomain('bob@sales.company.com.au')).toBe('company.com.au');
  });

  it('returns null for an unparseable address', () => {
    expect(extractBaseDomain('nonsense')).toBeNull();
  });
});

describe('isBootstrapAdmin', () => {
  it('matches an email in the allow-list', () => {
    expect(isBootstrapAdmin('admin@example.com', 'admin@example.com')).toBe(true);
  });

  it('matches within a comma-separated list, ignoring whitespace and case', () => {
    expect(isBootstrapAdmin('Admin@Example.com', 'first@x.com, admin@example.com ,b@y.com')).toBe(
      true,
    );
  });

  it('rejects an email not in the list', () => {
    expect(isBootstrapAdmin('someone@example.com', 'admin@example.com')).toBe(false);
  });

  it.each([undefined, '', '  ', ',,,'])('rejects everything when the allow-list is %p', (list) => {
    // An empty or malformed ADMIN_EMAILS must never grant admin to anyone —
    // this is the difference between "no bootstrap admin" and "everyone is one".
    expect(isBootstrapAdmin('anyone@example.com', list)).toBe(false);
  });
});
