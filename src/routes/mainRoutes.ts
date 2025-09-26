import { Router } from 'express';
import hotelRouter from './Hotel';
import roomRouter from './Room';
import userRouter from './User';
import flightRouter from './Flight';
import bdsdHotelRouter from './Hotel/bdsdHotel';
import busRouter from './Bus';
import bookingRouter from './Booking';
import paymentRouter from './Payment/index';
import jwtAuthMiddleware from '@/middleware/session';

const router = Router();

router.use('/hotel', hotelRouter);
router.use('/bdsdHotel', bdsdHotelRouter);
router.use('/flight', flightRouter);
router.use('/bus', busRouter);
router.use('/room', roomRouter);
router.use('/user', jwtAuthMiddleware, userRouter);
router.use('/booking', jwtAuthMiddleware, bookingRouter);
router.use('/payment', jwtAuthMiddleware, paymentRouter);

export default router;
