import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { enforceDataOwnership } from '../middleware/enforceDataOwnership';
import { 
    getNarratives, 
    getCurrentNarrative, 
    updateNarrative, 
    shareNarrative, 
    revokeNarrativeShare, 
    getSharedNarrative 
} from '../controllers/narrativeController';

const router = Router();

router.get('/shared/:token', getSharedNarrative); // PUBLIC

router.use(protect, enforceDataOwnership);

router.get('/', getNarratives);
router.get('/current', getCurrentNarrative);
router.patch('/:id', updateNarrative);
router.post('/:id/share', shareNarrative);
router.delete('/:id/share', revokeNarrativeShare);

export default router;
