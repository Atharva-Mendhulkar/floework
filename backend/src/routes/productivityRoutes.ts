import { Router } from 'express';
import { getDailyProductivity, logProductivity, getTeamStatus, getAnalyticsDashboard } from '../controllers/productivityController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

router.route('/')
    .get(getDailyProductivity)
    .post(logProductivity);

router.get('/team-status', getTeamStatus);
router.get('/dashboard', getAnalyticsDashboard);

export default router;
