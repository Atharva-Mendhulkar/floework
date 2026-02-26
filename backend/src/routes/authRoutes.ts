import { Router } from 'express';
import { registerUser, loginUser, getMe } from '../controllers/authController';
import { googleAuth, githubAuth } from '../controllers/oauthController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/github', githubAuth);
router.get('/me', protect, getMe);

export default router;
