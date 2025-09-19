import { Router } from 'express';
import { createHotel, createHotelWithRooms, deleteHotel, deleteMultipleHotels, getAllHotels, searchHotelsForBooking, updateHotel } from '@/controllers/hotels';
import { searchCityForHotel } from '@/controllers/search';

const hotelRouter = Router();

// POST routes
hotelRouter.get('/searchCity', searchCityForHotel);
hotelRouter.post('/', createHotel);
hotelRouter.post('/with-rooms', createHotelWithRooms); // Create a hotel with rooms
hotelRouter.post('/delete-many', deleteMultipleHotels) // Delete many hotels with specific ids: string[]

// GET routes
hotelRouter.get('/', getAllHotels)
hotelRouter.post('/searchHotelsForBooking', searchHotelsForBooking)

// PUT routes
hotelRouter.put('/:_id', updateHotel)

//DELETE routes
hotelRouter.delete('/:_id', deleteHotel)

export default hotelRouter;