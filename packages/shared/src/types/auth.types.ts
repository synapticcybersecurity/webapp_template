/**
 * Authentication and User Types
 * Shared between frontend and backend
 */

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  role: UserRole;
  createdAt: Date | string;
  updatedAt: Date | string;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | string | null;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date | string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuthResponse {
  user: User;
  session: Session;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface UpdateProfileRequest {
  name?: string;
  image?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Admin-specific types
export interface UpdateUserRoleRequest {
  userId: string;
  role: UserRole;
}

export interface BanUserRequest {
  userId: string;
  reason: string;
  expiresAt?: Date | string;
}

export interface UnbanUserRequest {
  userId: string;
}
