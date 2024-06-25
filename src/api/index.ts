import actionRoutes from '@/routes/action';
import doneRoutes from '@/routes/done';
import draftRoutes from '@/routes/draft';
import planningRoutes from '@/routes/planning';
import waitingRoutes from '@/routes/waiting';
import { Router } from 'express';

const router = Router();

router.use('/waiting', waitingRoutes);
router.use('/planning', planningRoutes);
router.use('/draft', draftRoutes);
router.use('/usertrigger', actionRoutes);
router.use('/done', doneRoutes);

export default router;
