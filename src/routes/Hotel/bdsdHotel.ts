import { searchHotel } from '@/controllers/bdsdHotels';
import { Router } from 'express';

const bdsdHotelRouter = Router();

bdsdHotelRouter.post('/searchHotel', searchHotel)

export default bdsdHotelRouter;