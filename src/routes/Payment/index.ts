import { Router } from 'express';
import razorpayPaymentRouter from './Razorpay';

const paymentRouter = Router();

paymentRouter.use('/razorpay', razorpayPaymentRouter);
export default paymentRouter;
