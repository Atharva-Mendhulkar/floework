import { Router } from 'express';
import { 
    registerUser, loginUser, getMe, 
    connectGitHub, githubCallback, disconnectGitHub,
    connectGoogleCalendar, googleCalendarCallback, disconnectGoogleCalendar, getGoogleCalendarStatus,
    setupWorkspace
} from '../controllers/authController';
import { googleAuth, githubAuth } from '../controllers/oauthController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/github', githubAuth);
router.get('/me', protect, getMe);

router.post('/setup-workspace', protect, setupWorkspace);

router.get('/github', connectGitHub);
router.get('/github/callback', githubCallback);
router.delete('/github', protect, disconnectGitHub);

router.get('/google-calendar', connectGoogleCalendar);
router.get('/google-calendar/callback', googleCalendarCallback);
router.delete('/google-calendar', protect, disconnectGoogleCalendar);
router.get('/google-calendar/status', protect, getGoogleCalendarStatus);

export default router;
