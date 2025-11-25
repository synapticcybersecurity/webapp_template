/**
 * Email Configuration and Service
 * Uses Postmark for reliable email delivery
 */

import { ServerClient } from 'postmark';
import { logger } from '../utils/logger.js';

const POSTMARK_API_KEY = process.env.POSTMARK_API_KEY || '';
const FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL || 'noreply@example.com';
const FROM_NAME = process.env.POSTMARK_FROM_NAME || 'Your App';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === 'true';

// Initialize Postmark client
const postmarkClient = EMAIL_TEST_MODE
  ? null
  : new ServerClient(POSTMARK_API_KEY);

/**
 * Send verification email to new users
 */
export async function sendVerificationEmail(
  email: string,
  verificationUrl: string,
  token: string
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
export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
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
  const subject = `You've been invited to join ${organizationName}`;
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
          <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as a <span class="role-badge">${role}</span>.</p>
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
};
