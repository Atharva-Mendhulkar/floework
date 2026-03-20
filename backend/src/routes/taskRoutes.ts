import { Router } from 'express';
import { getTasks, updateTaskState, createTask, toggleTaskStar, getTaskReplay, linkPR, deleteSampleTasks } from '../controllers/taskController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
    .get(getTasks)
    .post(createTask);

router.route('/samples')
    .delete(deleteSampleTasks);

router.route('/:id')
    .patch(updateTaskState);

router.route('/:id/star')
    .patch(toggleTaskStar);

router.route('/:id/replay')
    .get(getTaskReplay);

router.post('/:id/pr', protect, linkPR);

export default router;
