import express from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/project.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getProjects)
  .post(protect, authorize('admin', 'manager'), createProject);

router
  .route('/:id')
  .get(protect, getProjectById)
  .put(protect, authorize('admin', 'manager'), updateProject)
  .delete(protect, authorize('admin'), deleteProject);

export default router;