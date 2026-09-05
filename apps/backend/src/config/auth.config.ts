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

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || '';
const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE === 'true';
const SESSION_COOKIE_SAME_SITE = (process.env.SESSION_COOKIE_SAME_SITE || 'lax') as
  'lax' | 'strict' | 'none';
const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS || '7');

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

  // Rate limiting
  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 10, // 10 requests per window
  },

  // Database hooks for admin approval workflow
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-ban new users pending admin approval
          return {
            data: {
              ...user,
              banned: true,
              banReason: 'pending_approval',
            },
          };
        },
        after: async (user) => {
          // Notify all admin users of the new registration
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
        },
      },
    },
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
