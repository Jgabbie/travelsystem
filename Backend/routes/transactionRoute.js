import express from 'express';
import * as transactionController from '../controllers/transactionController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

const staffOnly = authorizeRoles('Admin', 'Employee');


router.get(
    '/user-transactions',
    userAuth,
    transactionController.getUserTransactions
);

router.get(
    '/application/:applicationId',
    userAuth,
    transactionController.getTransactionsForApplication
);

router.post(
    '/create-transaction',
    userAuth,
    staffOnly,
    transactionController.createTransaction
);

router.get(
    '/all-transactions',
    userAuth,
    staffOnly,
    transactionController.getAllTransactions
);

router.get(
    '/invoice-number',
    userAuth,
    staffOnly,
    transactionController.getInvoiceNumber
);

router.get(
    '/archived-transactions',
    userAuth,
    staffOnly,
    transactionController.getArchivedTransactions
);

router.post(
    '/archived-transactions/:id/restore',
    userAuth,
    staffOnly,
    transactionController.restoreArchivedTransaction
);

router.put(
    '/:id/reject',
    userAuth,
    staffOnly,
    transactionController.rejectTransaction
);

router.put(
    '/:id',
    userAuth,
    staffOnly,
    transactionController.updateTransaction
);

router.delete(
    '/:id',
    userAuth,
    staffOnly,
    transactionController.deleteTransaction
);

export default router;