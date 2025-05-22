import express from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from '../controllers/company.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getCompanies)
  .post(protect, authorize('admin', 'manager'), createCompany);

router
  .route('/:id')
  .get(protect, getCompanyById)
  .put(protect, authorize('admin', 'manager'), updateCompany)
  .delete(protect, authorize('admin'), deleteCompany);

export default router;