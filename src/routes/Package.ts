import { createPackage, getPackage, getPackages, updatePackage } from '@/controllers/packages';
import jwtAuthMiddleware from '@/middleware/session';
import { Router } from 'express';

const packageRouter = Router();

packageRouter.get('/', getPackages)
packageRouter.get('/:id', getPackage)
packageRouter.post('/', jwtAuthMiddleware, createPackage)
packageRouter.put('/:id', jwtAuthMiddleware, updatePackage)

export default packageRouter;