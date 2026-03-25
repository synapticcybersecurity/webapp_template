/**
 * Email Configuration and Service
 * Uses Postmark for reliable email delivery
 */

import { ServerClient } from 'postmark';
import { logger } from '../utils/logger.js';

/**
 * Escape user-controlled strings before embedding in HTML email templates
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY || '';
const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || 'noreply@example.com';
const FROM_NAME = process.env.POSTMARK_FROM_NAME || 'Your App';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === 'true';

// Initialize Postmark client
const postmarkClient = EMAIL_TEST_MODE ? null : new ServerClient(POSTMARK_API_KEY);

/**
 * Send verification email to new users
 */
export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
  _token: string
): Promise<void> {
  const subject = 'Verify your email address';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to ${FROM_NAME}!</h1>
          <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
          <p style="margin: 30px 0;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Welcome to ${FROM_NAME}!

Thank you for signing up. Please verify your email address by clicking this link:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
  `.trim();

  await sendEmail(email, subject, htmlBody, textBody);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const subject = 'Reset your password';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Password Reset Request</h1>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
            <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Password Reset Request

We received a request to reset your password. Click this link to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
  `.trim();

  await sendEmail(email, subject, htmlBody, textBody);
}

/**
 * Send organization invitation email
 */
export async function sendOrganizationInvitationEmail(
  email: string,
  organizationName: string,
  inviterName: string,
  role: string,
  invitationUrl: string
): Promise<void> {
  const subject = `You've been invited to join ${escapeHtml(organizationName)}`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; }
          .role-badge { display: inline-block; padding: 4px 12px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; font-size: 14px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Organization Invitation</h1>
          <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(organizationName)}</strong> as a <span class="role-badge">${escapeHtml(role)}</span>.</p>
          <p style="margin: 30px 0;">
            <a href="${invitationUrl}" class="button">Accept Invitation</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${invitationUrl}</p>
          <p>This invitation will expire in 7 days.</p>
          <div class="footer">
            <p>If you don't want to accept this invitation, you can safely ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Organization Invitation

${inviterName} has invited you to join ${organizationName} as a ${role}.

Accept invitation: ${invitationUrl}

This invitation will expire in 7 days.

If you don't want to accept this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
  `.trim();

  await sendEmail(email, subject, htmlBody, textBody);
}

/**
 * Send email to admin notifying them of a new registration pending approval
 */
export async function sendPendingApprovalEmail(
  adminEmail: string,
  userName: string,
  userEmail: string
): Promise<void> {
  const subject = `New registration pending approval: ${escapeHtml(userEmail)}`;
  const adminUrl = `${FRONTEND_URL}/admin/users?tab=pending`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>New Registration Pending Approval</h1>
          <p>A new user has registered and is waiting for admin approval:</p>
          <ul>
            <li><strong>Name:</strong> ${escapeHtml(userName)}</li>
            <li><strong>Email:</strong> ${escapeHtml(userEmail)}</li>
          </ul>
          <p style="margin: 30px 0;">
            <a href="${adminUrl}" class="button">Review Pending Approvals</a>
          </p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
New Registration Pending Approval

A new user has registered and is waiting for admin approval:

Name: ${userName}
Email: ${userEmail}

Review pending approvals: ${adminUrl}

© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
  `.trim();

  await sendEmail(adminEmail, subject, htmlBody, textBody);
}

/**
 * Send email to user notifying them their account has been approved
 */
export async function sendAccountApprovedEmail(email: string, loginUrl: string): Promise<void> {
  const subject = 'Your account has been approved';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Account Approved!</h1>
          <p>Great news! Your account has been reviewed and approved by an administrator. You can now sign in and start using ${FROM_NAME}.</p>
          <p style="margin: 30px 0;">
            <a href="${loginUrl}" class="button">Sign In</a>
          </p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Account Approved!

Great news! Your account has been reviewed and approved by an administrator. You can now sign in and start using ${FROM_NAME}.

Sign in: ${loginUrl}

© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
  `.trim();

  await sendEmail(email, subject, htmlBody, textBody);
}

/**
 * Send email to user notifying them their registration was rejected
 */
export async function sendAccountRejectedEmail(email: string, reason?: string): Promise<void> {
  const subject = 'Your registration was not approved';
  const reasonText = reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : '';
  const reasonPlain = reason ? `\nReason: ${reason}\n` : '';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Registration Not Approved</h1>
          <p>We're sorry, but your registration was not approved by an administrator.</p>
          ${reasonText}
          <p>If you believe this was a mistake, please contact support.</p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
Registration Not Approved

We're sorry, but your registration was not approved by an administrator.
${reasonPlain}
If you believe this was a mistake, please contact support.

© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.
  `.trim();

  await sendEmail(email, subject, htmlBody, textBody);
}

/**
 * Generic email sending function
 */
async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<void> {
  if (EMAIL_TEST_MODE) {
    logger.info('EMAIL TEST MODE - Email would be sent:', {
      to,
      subject,
      textBody,
    });
    return;
  }

  if (!postmarkClient) {
    throw new Error('Postmark client not initialized');
  }

  try {
    await postmarkClient.sendEmail({
      From: `${FROM_NAME} <${FROM_EMAIL}>`,
      To: to,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: 'outbound',
    });

    logger.info(`Email sent successfully to ${to}`);
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
}

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrganizationInvitationEmail,
  sendPendingApprovalEmail,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
};
