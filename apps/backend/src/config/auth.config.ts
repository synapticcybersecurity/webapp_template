/**
 * Better Auth Configuration
 * Complete authentication setup with email/password, organizations, and admin features
 */

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { organization } from 'better-auth/plugins';
import { prisma } from './database.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrganizationInvitationEmail,
  sendPendingApprovalEmail,
} from './email.js';
import { logger } from '../utils/logger.js';
import { createAuthMiddleware } from 'better-auth/api';
import { extractBaseDomain, isBootstrapAdmin } from '../services/email-domain.service.js';
import { logAuthEvent } from '../services/audit-log.service.js';

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || '';
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE === 'true';
const SESSION_COOKIE_SAME_SITE = (process.env.SESSION_COOKIE_SAME_SITE || 'lax') as
  'lax' | 'strict' | 'none';
const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS || '7');
const ADMIN_EMAILS = process.env.ADMIN_EMAILS || '';
const TRIAL_DAYS = parseInt(process.env.TRIAL_PERIOD_DAYS || '14');

if (!BETTER_AUTH_SECRET || BETTER_AUTH_SECRET.length < 32) {
  logger.error('BETTER_AUTH_SECRET must be set and at least 32 characters long');
  process.exit(1);
}

// Enforce secure cookies in production
if (process.env.NODE_ENV === 'production' && !SESSION_COOKIE_SECURE) {
  logger.error(
    'SESSION_COOKIE_SECURE must be "true" in production to prevent cookie interception over HTTP',
  );
  process.exit(1);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Base URL for the auth server
  baseURL: BETTER_AUTH_URL,

  // Secret for signing cookies and tokens
  secret: BETTER_AUTH_SECRET,

  // Trust proxy headers (important for production behind load balancers)
  trustedOrigins: [FRONTEND_URL],

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    // Send password reset email
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      logger.info(`Sending password reset email to ${user.email}`);
      await sendPasswordResetEmail(user.email, url);
    },
  },

  // Email verification
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({
      user,
      url,
      token,
    }: {
      user: { email: string };
      url: string;
      token: string;
    }) => {
      logger.info(`Sending verification email to ${user.email}`);
      await sendVerificationEmail(user.email, url, token);
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * SESSION_EXPIRY_DAYS, // 7 days by default
    updateAge: 60 * 60 * 24, // 1 day - refresh session if older than this

    // Cookie caching for better performance
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Security settings
  advanced: {
    cookiePrefix: 'webapp',
    useSecureCookies: SESSION_COOKIE_SECURE,
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      sameSite: SESSION_COOKIE_SAME_SITE,
      httpOnly: true,
      path: '/',
    },
  },

  /**
   * Rate limiting.
   *
   * The default applies to every `/api/auth/*` endpoint, and that includes
   * `get-session`, which the client calls on essentially every protected route
   * render. A blanket 10/minute therefore throttled ordinary navigation: once
   * exhausted, `get-session` returned 429, the client read the failed response
   * as "no session", and ProtectedRoute bounced the user to /login with no
   * error shown. It looked like a random logout, or like the sign-in button
   * doing nothing.
   *
   * The limit is keyed by IP rather than by user, so a shared office NAT made
   * that budget collective.
   *
   * So: a workable default for session reads, and genuinely strict limits on
   * the credential endpoints, which is where brute-force protection actually
   * matters. Signup and password reset are *tighter* than before (5/min, down
   * from 10).
   */
  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forget-password': { window: 60, max: 5 },
      '/reset-password': { window: 60, max: 5 },
    },
  },

  // Database hooks: admin approval workflow and tenant auto-join
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Ban-by-default: every new user is `pending_approval` until an
          // admin approves them. One bypass — an email in ADMIN_EMAILS becomes
          // an admin immediately. Without that bypass a fresh deployment has
          // no one able to approve anybody, and the whole instance deadlocks.
          if (isBootstrapAdmin(user.email, ADMIN_EMAILS)) {
            logger.info(`Bootstrap admin recognised on signup: ${user.email}`);
            return { data: { ...user, role: 'admin', emailVerified: true } };
          }
          return {
            data: { ...user, banned: true, banReason: 'pending_approval' },
          };
        },
        after: async (user) => {
          // Two best-effort steps. Neither may break signup, so each carries
          // its own try/catch rather than sharing one.

          // 1. Auto-join the tenant that owns this email domain.
          try {
            const domain = extractBaseDomain(user.email);
            if (domain) {
              const orgDomain = await prisma.organizationDomain.findUnique({
                where: { domain },
                select: { organizationId: true },
              });
              if (orgDomain) {
                // The first user into an org becomes its owner. Otherwise an
                // org created by domain import would have no one able to
                // manage billing or invite anyone.
                const memberCount = await prisma.organizationMember.count({
                  where: { organizationId: orgDomain.organizationId },
                });
                await prisma.organizationMember.upsert({
                  where: {
                    organizationId_userId: {
                      organizationId: orgDomain.organizationId,
                      userId: user.id,
                    },
                  },
                  create: {
                    organizationId: orgDomain.organizationId,
                    userId: user.id,
                    role: memberCount === 0 ? 'owner' : 'member',
                  },
                  update: {},
                });
                logger.info(
                  `Auto-joined ${user.email} to organization ${orgDomain.organizationId} via domain ${domain}`,
                );
              }
            }
          } catch (error) {
            logger.error('Organization domain auto-join failed:', error);
          }

          // 2. Tell the admins someone is waiting — but only if they actually
          // landed in the queue. A bootstrap admin needs no approval.
          if ((user as { banned?: boolean }).banned) {
            try {
              const admins = await prisma.user.findMany({
                where: { role: 'admin' },
                select: { email: true },
              });
              for (const admin of admins) {
                await sendPendingApprovalEmail(admin.email, user.name || 'Unknown', user.email);
              }
            } catch (error) {
              logger.error('Failed to send pending approval notification emails:', error);
            }
          }

          void logAuthEvent('user_registered', user.id, { email: user.email });
        },
      },
    },
    session: {
      create: {
        // Give a new session the user's org as its initial scope, so a
        // single-org user is scoped from their first request without having to
        // touch a switcher they will never see. Admins are left unscoped
        // (platform-wide) on purpose.
        before: async (session) => {
          try {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { role: true },
            });
            if (user?.role === 'admin') return { data: session };

            const membership = await prisma.organizationMember.findFirst({
              where: { userId: session.userId },
              orderBy: { createdAt: 'asc' },
              select: { organizationId: true },
            });
            if (membership) {
              return {
                data: { ...session, activeOrganizationId: membership.organizationId },
              };
            }
          } catch (error) {
            logger.error('Failed to set initial active organization on session:', error);
          }
          return { data: session };
        },
      },
    },
  },

  /**
   * Audit trail for authentication and privileged admin events.
   *
   * These are the actions a security review asks about after the fact —
   * especially impersonation, bans and role changes, where the acting admin
   * and the affected user are different people and the request log alone
   * cannot tell them apart. Writes are best-effort and never block the flow.
   */
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const context = ctx.context as {
        session?: { user?: { id?: string; email?: string } };
        newSession?: { user?: { id?: string; email?: string } };
      };
      // On sign-in the prior session is empty, so the newly created session is
      // the one that identifies the actor.
      const actor = context.newSession?.user ?? context.session?.user;
      const actorId = actor?.id;
      const actorEmail = actor?.email;
      const ip = ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim();

      switch (ctx.path) {
        case '/sign-in/email':
        case '/sign-in/social':
          if (actorId) void logAuthEvent('user_signed_in', actorId, { email: actorEmail }, ip);
          break;
        case '/sign-out':
          if (actorId) void logAuthEvent('user_signed_out', actorId, { email: actorEmail }, ip);
          break;
        case '/verify-email':
          if (actorId) void logAuthEvent('email_verified', actorId, { email: actorEmail }, ip);
          break;
        case '/change-password':
          if (actorId) void logAuthEvent('password_changed', actorId, { email: actorEmail }, ip);
          break;
        case '/reset-password':
          void logAuthEvent('password_reset_completed', actorId, undefined, ip);
          break;
        case '/admin/impersonate-user': {
          // ctx.context.session is still the admin here; the target is in the
          // request body. Record both, or the trail cannot answer "who did
          // this to whom".
          const targetUserId = (ctx.body as { userId?: string } | undefined)?.userId ?? null;
          const adminId = context.session?.user?.id;
          if (adminId) {
            void logAuthEvent(
              'user_impersonation_started',
              adminId,
              { adminEmail: context.session?.user?.email, targetUserId },
              ip,
            );
          }
          break;
        }
        case '/admin/stop-impersonating': {
          // After stopping, newSession is the restored admin. Attribute the
          // event to the admin so the trail reads as one continuous action.
          const restoredAdmin = context.newSession?.user;
          if (restoredAdmin?.id) {
            void logAuthEvent(
              'user_impersonation_stopped',
              restoredAdmin.id,
              { adminEmail: restoredAdmin.email },
              ip,
            );
          }
          break;
        }
        case '/admin/ban-user':
          void logAuthEvent(
            'user_banned',
            actorId,
            { targetUserId: (ctx.body as { userId?: string } | undefined)?.userId ?? null },
            ip,
          );
          break;
        case '/admin/unban-user':
          void logAuthEvent(
            'user_unbanned',
            actorId,
            { targetUserId: (ctx.body as { userId?: string } | undefined)?.userId ?? null },
            ip,
          );
          break;
        case '/admin/set-role':
          void logAuthEvent(
            'user_role_changed',
            actorId,
            { targetUserId: (ctx.body as { userId?: string } | undefined)?.userId ?? null },
            ip,
          );
          break;
        case '/organization/accept-invitation':
          if (actorId) void logAuthEvent('invitation_accepted', actorId, { email: actorEmail }, ip);
          break;
      }
    }),
  },

  // Plugins
  plugins: [
    // Admin plugin for user management
    admin({
      defaultRole: 'user',
      impersonationSessionDuration: 60 * 15, // 15 minutes
    }),

    // Organization plugin for multi-tenant support
    organization({
      organizationHooks: {
        // Start every new tenant on a free trial. Without this an org is
        // created already paywalled and the first thing a new customer sees is
        // a payment wall instead of the product.
        //
        // This belongs to the organization plugin, not databaseHooks —
        // databaseHooks only covers Better Auth's core models (user, session,
        // account, verification), so an `organization` entry there is accepted
        // but never called.
        beforeCreateOrganization: async ({ organization }) => {
          return {
            data: {
              ...organization,
              trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
            },
          };
        },
      },
      // Send invitation email when member is invited
      async sendInvitationEmail(data) {
        logger.info(`Sending organization invitation to ${data.email}`);

        const invitationUrl = `${FRONTEND_URL}/organizations/invitations/${data.id}`;

        const inviter = data.inviter as { name?: string; email?: string } | undefined;
        await sendOrganizationInvitationEmail(
          data.email,
          data.organization.name,
          inviter?.name || inviter?.email || 'Someone',
          data.role,
          invitationUrl,
        );
      },

      // Schema configuration for Prisma
      schema: {
        organization: {
          modelName: 'organization',
        },
        member: {
          modelName: 'organizationMember',
        },
        invitation: {
          modelName: 'organizationInvitation',
        },
      },
    }),
  ],

  // Social OAuth providers (commented out - uncomment and add credentials to enable)
  /*
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      // Scopes for GitHub
      scopes: ['user:email'],
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      // Scopes for Google
      scopes: ['openid', 'email', 'profile'],
    },
  },
  */
});

export type Auth = typeof auth;

export default auth;
