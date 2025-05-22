import express from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  rejectTransaction,
  getFinancialSummary,
  exportTransactions,
} from '../controllers/finance.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getTransactions)
  .post(protect, createTransaction);

router
  .route('/:id')
  .get(protect, getTransactionById)
  .put(protect, updateTransaction)
  .delete(protect, authorize('admin'), deleteTransaction);

router.put('/:id/approve', protect, authorize('admin', 'manager'), approveTransaction);
router.put('/:id/reject', protect, authorize('admin', 'manager'), rejectTransaction);
router.get('/summary', protect, getFinancialSummary);
router.get('/export', protect, exportTransactions);

export default router;