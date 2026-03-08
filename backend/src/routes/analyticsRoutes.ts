import { Router } from 'express';
import {
    getTaskExecutionSignals,
    getStabilityGrid,
    getNarrative,
    getBottlenecks,
    getBurnout,
} from '../controllers/analyticsController';

const router = Router();

router.get('/task/:taskId/signals', getTaskExecutionSignals);
router.get('/stability', getStabilityGrid);
router.get('/narrative', getNarrative);
router.get('/bottlenecks', getBottlenecks);
router.get('/burnout', getBurnout);

export default router;
