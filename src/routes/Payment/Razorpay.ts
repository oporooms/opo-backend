import { createOrder, verifyOrder } from '@/controllers/Payment/Razorpay';
import { Router } from 'express';

const razorpayPaymentRouter = Router();

razorpayPaymentRouter.post('/createOrder', createOrder)
razorpayPaymentRouter.post('/verifyOrder', verifyOrder)
razorpayPaymentRouter.post('/updatePayment', verifyOrder)

export default razorpayPaymentRouter;