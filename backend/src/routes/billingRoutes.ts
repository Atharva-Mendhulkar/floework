import { Router } from 'express';
import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getBillingStatus,
    createCheckoutSession,
    createPortalSession,
    handleWebhook,
} from '../controllers/billingController';

const router = Router();

// Webhook must use raw body — mounted before JSON middleware in server.ts
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected billing routes
router.use(protect);
router.get('/status', getBillingStatus);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createPortalSession);

export default router;
