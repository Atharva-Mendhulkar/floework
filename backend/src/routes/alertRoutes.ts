import { Router } from 'express';
import { getAlerts, markAlertAsRead, markAllAlertsAsRead } from '../controllers/alertController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.route('/')
    .get(getAlerts);

router.route('/read-all')
    .post(markAllAlertsAsRead);

router.route('/:id/read')
    .patch(markAlertAsRead);

export default router;
