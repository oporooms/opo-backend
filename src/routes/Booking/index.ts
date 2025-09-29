import { createFlightBooking } from "@/controllers/Booking/flight";
import { createHotelBooking } from "@/controllers/Booking/hotel";
import jwtAuthMiddleware from "@/middleware/session";
import { Router } from "express";

const bookingRouter = Router();

bookingRouter.post("/hotel", jwtAuthMiddleware, createHotelBooking)
bookingRouter.post("/flight", jwtAuthMiddleware, createFlightBooking)

export default bookingRouter;