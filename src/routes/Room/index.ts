import { createRooms, deleteMultipleRooms, deleteRoom, getAllRooms, updateRoom } from '@/controllers/room';
import { Router } from 'express';
const roomRouter = Router();

// POST routes
roomRouter.post('/', createRooms);
roomRouter.post('/delete-many', deleteMultipleRooms) // Delete many hotels with specific ids: string[]

// GET routes
roomRouter.get('/', getAllRooms)

// PUT routes
roomRouter.put('/:_id', updateRoom)

//DELETE routes
roomRouter.delete('/:_id', deleteRoom)

export default roomRouter;