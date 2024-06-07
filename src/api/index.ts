import { Router } from 'express';
import waitingRoutes from '../routes/waiting';
import planningRoutes from '../routes/planning';
import draftRoutes from '../routes/draft';
import userTriggerRoutes from '../routes/userTrigger';
import doneRoutes from '../routes/done';

const router = Router();

router.use('/waiting', waitingRoutes);
router.use('/planning', planningRoutes);
router.use('/draft', draftRoutes);
router.use('/usertrigger', userTriggerRoutes);
router.use('/done', doneRoutes);

export default router;
