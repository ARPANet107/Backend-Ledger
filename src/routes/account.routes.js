const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const accountController = require('../controllers/account.controller');
const { route } = require('./auth.routes');

const router = express.Router();


/**
 * - POST /api/accounts/
 * - Create a new account
 * - Protected Route
 */
router.post("/",authMiddleware.authMiddleware,accountController.createAccountController);

/**
 * - GET /api/accounts
 * - Get all accounts of the logged-in user
 * - Protected Route
 */
router.get("/",authMiddleware.authMiddleware,accountController.getUserAccountsController);

/**
 * - GET /api/aaccounts/balance/:accountId
 */
router.get("/balance/:accountId",authMiddleware.authMiddleware,accountController.getAccountBalanceController);

module.exports = router