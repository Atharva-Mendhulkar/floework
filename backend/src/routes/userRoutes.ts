import { Router } from 'express';
import { getUsers, getUserById, createUser, getProfile, updateProfile, hasRealTasks } from '../controllers/userController';

const router = Router();

router.route('/')
    .get(getUsers)
    .post(createUser);

router.route('/me')
    .get(getProfile)
    .put(updateProfile);

router.route('/me/has-real-tasks')
    .get(hasRealTasks);

router.route('/:id')
    .get(getUserById);

export default router;
