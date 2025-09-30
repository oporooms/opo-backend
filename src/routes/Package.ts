import { getPackages } from '@/controllers/packages';
import { Router } from 'express';

const packageRouter = Router();

packageRouter.get('/', getPackages)

export default packageRouter;