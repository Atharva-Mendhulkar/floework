import { Router } from 'express';
import { createTeam, getMyTeams, inviteMember, updateMemberRole, removeMember } from '../controllers/teamController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect); // Ensure all team routes are protected

router.post('/', createTeam);
router.get('/', getMyTeams);
router.post('/:teamId/invite', inviteMember);
router.patch('/:teamId/members/:userId', updateMemberRole);
router.delete('/:teamId/members/:userId', removeMember);

export default router;
