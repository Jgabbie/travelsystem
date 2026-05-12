const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const userAuth = require('../middleware/userAuth');

router.post('/create-transaction', userAuth, transactionController.createTransaction);
router.get('/user-transactions', userAuth, transactionController.getUserTransactions);
router.get('/all-transactions', userAuth, transactionController.getAllTransactions);
router.get('/invoice-number', userAuth, transactionController.getInvoiceNumber);
router.get('/archived-transactions', userAuth, transactionController.getArchivedTransactions);
router.post('/archived-transactions/:id/restore', userAuth, transactionController.restoreArchivedTransaction);
router.put('/:id', userAuth, transactionController.updateTransaction);
router.put('/:id/reject', userAuth, transactionController.rejectTransaction);
router.delete('/:id', userAuth, transactionController.deleteTransaction);
module.exports = router;