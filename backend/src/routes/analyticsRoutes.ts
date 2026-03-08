import { Router } from 'express';
import {
    getTaskExecutionSignals,
    getStabilityGrid,
    getNarrative,
} from '../controllers/analyticsController';

const router = Router();

router.get('/task/:taskId/signals', getTaskExecutionSignals);
router.get('/stability', getStabilityGrid);
router.get('/narrative', getNarrative);

export default router;
