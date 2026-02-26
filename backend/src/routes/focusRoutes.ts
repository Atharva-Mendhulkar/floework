import { Router } from 'express';
import { startFocusSession, stopFocusSession, getUserFocusSessions } from '../controllers/focusController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Notice: ALL Focus endpoints require authentication.
// This gives us access to req.user.id inside our controller.
router.use(protect);

router.route('/')
    .get(getUserFocusSessions)
    .post(startFocusSession);

router.route('/:id/stop')
    .patch(stopFocusSession);

export default router;
