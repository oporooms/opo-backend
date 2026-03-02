import { updateBookingStatus, updateCompanyApproval } from "@/controllers/Booking";
import { createBdsdHotelBooking } from "@/controllers/Booking/bdsdHotel";
import { createBusBooking, getBusBookings } from "@/controllers/Booking/bus";
import { createFlightBooking, getFlightBookings } from "@/controllers/Booking/flight";
import { createHotelBooking, getHotelBookings } from "@/controllers/Booking/hotel";
import { createHomestayBooking, getHomestayBookings } from "@/controllers/Booking/homestay";
import jwtAuthMiddleware from "@/middleware/session";
import { Router } from "express";

const bookingRouter = Router();

bookingRouter.get("/hotel", jwtAuthMiddleware, getHotelBookings)
bookingRouter.get("/homestay", jwtAuthMiddleware, getHomestayBookings)
bookingRouter.get("/flight", jwtAuthMiddleware, getFlightBookings)
bookingRouter.get("/bus", jwtAuthMiddleware, getBusBookings)

bookingRouter.post("/bdsdHotel", jwtAuthMiddleware, createBdsdHotelBooking)
bookingRouter.post("/hotel", jwtAuthMiddleware, createHotelBooking)
bookingRouter.post("/homestay", jwtAuthMiddleware, createHomestayBooking)
bookingRouter.post("/flight", jwtAuthMiddleware, createFlightBooking)
bookingRouter.post("/bus", jwtAuthMiddleware, createBusBooking)

// bookingRouter.put("/updateBookingStatus", jwtAuthMiddleware, updateBookingStatus)
// bookingRouter.put("/updateCompanyApproval", jwtAuthMiddleware, updateCompanyApproval)

export default bookingRouter;