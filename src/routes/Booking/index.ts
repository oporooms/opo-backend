import { updateBookingStatus, updateCompanyApproval } from "@/controllers/Booking";
import { createBusBooking, getBusBookings } from "@/controllers/Booking/bus";
import { createFlightBooking, getFlightBookings } from "@/controllers/Booking/flight";
import { createHotelBooking, getHotelBookings } from "@/controllers/Booking/hotel";
import jwtAuthMiddleware from "@/middleware/session";
import { Router } from "express";

const bookingRouter = Router();

bookingRouter.get("/hotel", jwtAuthMiddleware, getHotelBookings)
bookingRouter.get("/flight", jwtAuthMiddleware, getFlightBookings)
bookingRouter.get("/bus", jwtAuthMiddleware, getBusBookings)

bookingRouter.post("/hotel", jwtAuthMiddleware, createHotelBooking)
bookingRouter.post("/flight", jwtAuthMiddleware, createFlightBooking)
bookingRouter.post("/bus", jwtAuthMiddleware, createBusBooking)

// bookingRouter.put("/updateBookingStatus", jwtAuthMiddleware, updateBookingStatus)
// bookingRouter.put("/updateCompanyApproval", jwtAuthMiddleware, updateCompanyApproval)

export default bookingRouter;