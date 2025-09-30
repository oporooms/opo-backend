import { blockRoom, hotelInfo, hotelRoom, searchHotel } from '@/controllers/bdsdHotels';
import { Router } from 'express';

const bdsdHotelRouter = Router();

bdsdHotelRouter.post('/searchHotel', searchHotel)
bdsdHotelRouter.get('/hotelInfo', hotelInfo)
bdsdHotelRouter.get('/hotelRoom', hotelRoom)
bdsdHotelRouter.post('/blockRoom', blockRoom)

export default bdsdHotelRouter;