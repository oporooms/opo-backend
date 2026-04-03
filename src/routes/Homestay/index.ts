import { createHomestay, deleteHomestay, deleteMultipleHomestays, getAllHomestays, getSingleHomestay, searchHomestayCity, updateHomestay } from '@/controllers/homestay';
import jwtAuthMiddleware from '@/middleware/session';
import { Router } from 'express';

const homestayRouter = Router();

homestayRouter.post('/', jwtAuthMiddleware, createHomestay);
homestayRouter.post('/delete-many', jwtAuthMiddleware, deleteMultipleHomestays);

homestayRouter.get('/', getAllHomestays);
homestayRouter.get('/searchCity', searchHomestayCity);
homestayRouter.get('/:slug', getSingleHomestay);

homestayRouter.put('/:_id', jwtAuthMiddleware, updateHomestay);
homestayRouter.delete('/:_id', jwtAuthMiddleware, deleteHomestay);

export default homestayRouter;
