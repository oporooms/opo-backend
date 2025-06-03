import { Router } from 'express';
import { getMessage } from '@/controllers/mainController';

const router = Router(); 

router.get('/', getMessage);

export default router;
