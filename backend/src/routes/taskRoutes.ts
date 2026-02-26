import { Router } from 'express';
import { getTasks, updateTaskState, createTask, toggleTaskStar } from '../controllers/taskController';

const router = Router();

router.route('/')
    .get(getTasks)
    .post(createTask);

router.route('/:id')
    .patch(updateTaskState);

router.route('/:id/star')
    .patch(toggleTaskStar);

export default router;
