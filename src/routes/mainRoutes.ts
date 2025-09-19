import { Router } from 'express';
import hotelRouter from './Hotel';
import roomRouter from './Room';
import userRouter from './User';
import flightRouter from './Flight';
import bdsdHotelRouter from './Hotel/bdsdHotel';

const router = Router();

router.use('/hotel', hotelRouter);
router.use('/bdsdHotel', bdsdHotelRouter);
router.use('/flight', flightRouter);
router.use('/room', roomRouter);
router.use('/user', userRouter);

export default router;
