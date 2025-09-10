import { Router } from 'express';
import { createHotel, createHotelWithRooms, deleteHotel, deleteMultipleHotels, getAllHotels, updateHotel } from '@/controllers/hotels';

const hotelRouter = Router();

// POST routes
hotelRouter.post('/', createHotel);
hotelRouter.post('/with-rooms', createHotelWithRooms); // Create a hotel with rooms
hotelRouter.post('/delete-many', deleteMultipleHotels) // Delete many hotels with specific ids: string[]

// GET routes
hotelRouter.get('/', getAllHotels)

// PUT routes
hotelRouter.put('/:_id', updateHotel)

//DELETE routes
hotelRouter.delete('/:_id', deleteHotel)

export default hotelRouter;