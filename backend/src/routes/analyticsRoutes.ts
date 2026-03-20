import { Router } from 'express';
import {
    getTaskExecutionSignals,
    getStabilityGrid,
    getNarrative,
    getBottlenecks,
    getBurnout,
    getFocusReports,
    getCurrentFocusReport,
    getEstimationHint,
    getEstimationAccuracy,
    getFocusWindows,
    getFocusWindowsIcs,
    getAiDisplacement,
} from '../controllers/analyticsController';

const router = Router();

router.get('/task/:taskId/signals', getTaskExecutionSignals);
router.get('/stability', getStabilityGrid);
router.get('/narrative', getNarrative);
router.get('/bottlenecks', getBottlenecks);
router.get('/burnout', getBurnout);
router.get('/focus-report', getFocusReports);
router.get('/focus-report/current', getCurrentFocusReport);
router.get('/estimation-hint', getEstimationHint);
router.get('/estimation-accuracy', getEstimationAccuracy);
router.get('/focus-windows', getFocusWindows);
router.get('/focus-windows/ics', getFocusWindowsIcs);
router.get('/ai-displacement', getAiDisplacement);

export default router;
