/**
 * Organization and Multi-tenant Types
 * Shared between frontend and backend
 */

export type OrganizationRole = 'owner' | 'admin' | 'member';

export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Populated fields (may not always be present)
  user?: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
  organization?: Organization;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedBy: string;
  expiresAt: Date | string;
  status: InvitationStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Populated fields (may not always be present)
  organization?: Organization;
  inviter?: {
    id: string;
    name: string | null;
    email: string;
  };
}

// Request/Response types
export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  logo?: string;
  metadata?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  logo?: string;
  metadata?: Record<string, any>;
}

export interface InviteMemberRequest {
  email: string;
  role: OrganizationRole;
}

export interface UpdateMemberRoleRequest {
  memberId: string;
  role: OrganizationRole;
}

export interface AcceptInvitationRequest {
  token: string;
}

export interface OrganizationWithRole extends Organization {
  userRole: OrganizationRole;
  memberCount?: number;
}
