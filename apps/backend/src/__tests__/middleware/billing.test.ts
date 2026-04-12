import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRequest, createMockResponse, createMockNext } from '../helpers/mock-request.js';

vi.mock('../../services/billing.service.js', () => ({
  checkPlanLimit: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { requirePlanLimit } from '../../middleware/billing.middleware.js';
import { checkPlanLimit } from '../../services/billing.service.js';

describe('Billing Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requirePlanLimit', () => {
    it('should call next() when under plan limit', async () => {
      (checkPlanLimit as any).mockResolvedValue(true);
      const middleware = requirePlanLimit('members');

      const req = createMockRequest({ params: { orgId: 'org-1' } });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(checkPlanLimit).toHaveBeenCalledWith('org-1', 'members');
      expect(next).toHaveBeenCalledWith();
    });

    it('should pass error to next() when over plan limit', async () => {
      (checkPlanLimit as any).mockResolvedValue(false);
      const middleware = requirePlanLimit('projects');

      const req = createMockRequest({ params: { orgId: 'org-1' } });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining('projects'),
        }),
      );
    });

    it('should skip check and call next() if no orgId found', async () => {
      const middleware = requirePlanLimit('members');

      const req = createMockRequest({ params: {}, body: {} });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(checkPlanLimit).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should extract orgId from params.organizationId', async () => {
      (checkPlanLimit as any).mockResolvedValue(true);
      const middleware = requirePlanLimit('members');

      const req = createMockRequest({
        params: { organizationId: 'org-2' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(checkPlanLimit).toHaveBeenCalledWith('org-2', 'members');
    });

    it('should extract orgId from body.organizationId', async () => {
      (checkPlanLimit as any).mockResolvedValue(true);
      const middleware = requirePlanLimit('projects');

      const req = createMockRequest({
        params: {},
        body: { organizationId: 'org-3' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(checkPlanLimit).toHaveBeenCalledWith('org-3', 'projects');
    });

    it('should pass service errors through to next()', async () => {
      (checkPlanLimit as any).mockRejectedValue(new Error('DB error'));
      const middleware = requirePlanLimit('members');

      const req = createMockRequest({ params: { orgId: 'org-1' } });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
