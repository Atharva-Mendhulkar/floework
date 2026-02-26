import { Router } from 'express';
import { getMessages, createMessage } from '../controllers/messageController';
import { protect } from '../middleware/authMiddleware';

const router = Router({ mergeParams: true }); // Enable bringing in projectId from parent router if needed

router.use(protect);

router.route('/')
    .get(getMessages)
    .post(createMessage);

export default router;
