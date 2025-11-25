/**
 * Organization Controller
 * Handles multi-tenant organization operations
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../utils/errors.js';
import { ApiResponse, Organization, OrganizationWithRole } from '@webapp/shared';
import { sendOrganizationInvitationEmail } from '../config/email.js';

/**
 * Create new organization
 */
export async function createOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, slug, logo, metadata } = req.body;
    const userId = req.user!.id;

    // Generate slug from name if not provided
    const orgSlug =
      slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Create organization with user as owner
    const organization = await prisma.organization.create({
      data: {
        name,
        slug: orgSlug,
        logo: logo || null,
        metadata: metadata || null,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    const response: ApiResponse<OrganizationWithRole> = {
      success: true,
      data: {
        ...organization,
        userRole: organization.members[0].role as any,
        memberCount: 1,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * List user's organizations
 */
export async function listUserOrganizations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;

    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const organizations: OrganizationWithRole[] = memberships.map((membership) => ({
      ...membership.organization,
      userRole: membership.role as any,
      memberCount: membership.organization._count.members,
    }));

    const response: ApiResponse<OrganizationWithRole[]> = {
      success: true,
      data: organizations,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Get organization by ID
 */
export async function getOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check membership
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this organization');
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    const response: ApiResponse = {
      success: true,
      data: {
        ...organization,
        userRole: membership.role,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Update organization
 */
export async function updateOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { name, slug, logo, metadata } = req.body;
    const userId = req.user!.id;

    // Check if user is owner or admin
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenError('Only owners and admins can update the organization');
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(logo !== undefined && { logo }),
        ...(metadata !== undefined && { metadata }),
      },
    });

    const response: ApiResponse<Organization> = {
      success: true,
      data: organization,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete organization
 */
export async function deleteOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Only owner can delete
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
    });

    if (!membership || membership.role !== 'owner') {
      throw new ForbiddenError('Only the owner can delete the organization');
    }

    await prisma.organization.delete({
      where: { id },
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'Organization deleted successfully' },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * List organization members
 */
export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify membership
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You are not a member of this organization');
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const response: ApiResponse = {
      success: true,
      data: members,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Invite member to organization
 */
export async function inviteMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { email, role } = req.body;
    const userId = req.user!.id;

    // Check if user can invite (owner or admin)
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenError('Only owners and admins can invite members');
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMembership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictError('User is already a member of this organization');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.organizationInvitation.findUnique({
      where: {
        organizationId_email: {
          organizationId: id,
          email,
        },
      },
    });

    if (existingInvitation && existingInvitation.status === 'pending') {
      throw new ConflictError('An invitation has already been sent to this email');
    }

    // Get organization and inviter details
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    const inviter = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!organization || !inviter) {
      throw new NotFoundError('Organization or inviter not found');
    }

    // Create invitation
    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: id,
        email,
        role,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending',
      },
    });

    // Send invitation email
    const invitationUrl = `${process.env.FRONTEND_URL}/organizations/invitations/${invitation.id}`;
    await sendOrganizationInvitationEmail(
      email,
      organization.name,
      inviter.name || inviter.email,
      role,
      invitationUrl
    );

    const response: ApiResponse = {
      success: true,
      data: invitation,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user!.id;

    // Check if user is owner
    const userMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
    });

    if (!userMembership || userMembership.role !== 'owner') {
      throw new ForbiddenError('Only the owner can change member roles');
    }

    // Cannot change own role
    if (memberId === userMembership.id) {
      throw new ForbiddenError('Cannot change your own role');
    }

    const member = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const response: ApiResponse = {
      success: true,
      data: member,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove member from organization
 */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id, memberId } = req.params;
    const userId = req.user!.id;

    // Check if user is owner or admin
    const userMembership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
    });

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      throw new ForbiddenError('Only owners and admins can remove members');
    }

    // Get member to remove
    const memberToRemove = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToRemove) {
      throw new NotFoundError('Member not found');
    }

    // Cannot remove owner
    if (memberToRemove.role === 'owner') {
      throw new ForbiddenError('Cannot remove the organization owner');
    }

    // Cannot remove self
    if (memberToRemove.userId === userId) {
      throw new ForbiddenError('Cannot remove yourself - use leave endpoint instead');
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'Member removed successfully' },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * List organization invitations
 */
export async function listInvitations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user is owner or admin
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenError('Only owners and admins can view invitations');
    }

    const invitations = await prisma.organizationInvitation.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse = {
      success: true,
      data: invitations,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Accept invitation (creates membership)
 */
export async function acceptInvitation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.params;
    const userId = req.user!.id;

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { id: token },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestError('Invitation has already been processed');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await prisma.organizationInvitation.update({
        where: { id: token },
        data: { status: 'expired' },
      });
      throw new BadRequestError('Invitation has expired');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.email !== invitation.email) {
      throw new ForbiddenError('This invitation is for a different email address');
    }

    // Create membership and update invitation
    const [member] = await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
        include: {
          organization: true,
        },
      }),
      prisma.organizationInvitation.update({
        where: { id: token },
        data: { status: 'accepted' },
      }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: member,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel invitation
 */
export async function cancelInvitation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { invitationId } = req.params;
    const userId = req.user!.id;

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    // Check if user is owner or admin
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new ForbiddenError('Only owners and admins can cancel invitations');
    }

    await prisma.organizationInvitation.delete({
      where: { id: invitationId },
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'Invitation cancelled successfully' },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}
