/**
 * Kept as a re-export so existing `@/hooks/useAuth` imports keep working.
 * The implementation moved to contexts/AuthContext, which derives isAdmin,
 * isImpersonating and activeOrganizationId from one shared session
 * subscription rather than each caller re-deriving them.
 */
export { useAuth } from '@/contexts/AuthContext';
