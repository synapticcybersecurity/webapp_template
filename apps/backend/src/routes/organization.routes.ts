/**
 * Organization Routes
 * Endpoints for multi-tenant organization management
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from '@webapp/shared';
import * as orgController from '../controllers/organization.controller.js';

const router = Router();

// =============================================================================
// Organization CRUD
// =============================================================================

// Create organization
router.post(
  '/',
  requireAuth,
  validateBody(createOrganizationSchema),
  orgController.createOrganization
);

// List user's organizations
router.get('/', requireAuth, orgController.listUserOrganizations);

// Get organization by ID
router.get('/:id', requireAuth, orgController.getOrganization);

// Update organization
router.patch(
  '/:id',
  requireAuth,
  validateBody(updateOrganizationSchema),
  orgController.updateOrganization
);

// Delete organization
router.delete('/:id', requireAuth, orgController.deleteOrganization);

// =============================================================================
// Member Management
// =============================================================================

// List organization members
router.get('/:id/members', requireAuth, orgController.listMembers);

// Invite member to organization
router.post(
  '/:id/members',
  requireAuth,
  validateBody(inviteMemberSchema),
  orgController.inviteMember
);

// Update member role
router.patch(
  '/:id/members/:memberId',
  requireAuth,
  validateBody(updateMemberRoleSchema),
  orgController.updateMemberRole
);

// Remove member from organization
router.delete('/:id/members/:memberId', requireAuth, orgController.removeMember);

// =============================================================================
// Invitation Management
// =============================================================================

// List organization invitations
router.get('/:id/invitations', requireAuth, orgController.listInvitations);

// Accept invitation
router.post('/invitations/:token/accept', requireAuth, orgController.acceptInvitation);

// Cancel invitation
router.delete('/invitations/:invitationId', requireAuth, orgController.cancelInvitation);

export default router;
