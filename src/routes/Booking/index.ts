import { createHotelBooking } from "@/controllers/Booking/hotel";
import jwtAuthMiddleware from "@/middleware/session";
import { Router } from "express";

const bookingRouter = Router();

bookingRouter.post("/hotel", jwtAuthMiddleware, createHotelBooking)

export default bookingRouter;