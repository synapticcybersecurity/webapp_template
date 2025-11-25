/**
 * Project Routes (Example Domain)
 * Demonstrates CRUD API patterns
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as projectController from '../controllers/project.controller.js';

const router = Router();

// Create project
router.post('/', requireAuth, projectController.createProject);

// List projects (with optional organization filter)
router.get('/', requireAuth, projectController.listProjects);

// Get project by ID
router.get('/:id', requireAuth, projectController.getProject);

// Update project
router.patch('/:id', requireAuth, projectController.updateProject);

// Delete project
router.delete('/:id', requireAuth, projectController.deleteProject);

export default router;
