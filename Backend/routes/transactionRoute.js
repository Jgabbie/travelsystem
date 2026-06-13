import express from 'express';
import * as transactionController from '../controllers/transactionController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

router.post('/create-transaction', userAuth, transactionController.createTransaction);
router.get('/user-transactions', userAuth, transactionController.getUserTransactions);
router.get('/application/:applicationId', userAuth, transactionController.getTransactionsForApplication);
router.get('/all-transactions', userAuth, transactionController.getAllTransactions);
router.get('/invoice-number', userAuth, transactionController.getInvoiceNumber);
router.get('/archived-transactions', userAuth, transactionController.getArchivedTransactions);
router.post('/archived-transactions/:id/restore', userAuth, transactionController.restoreArchivedTransaction);
router.put('/:id', userAuth, transactionController.updateTransaction);
router.put('/:id/reject', userAuth, transactionController.rejectTransaction);
router.delete('/:id', userAuth, transactionController.deleteTransaction);
export default router;