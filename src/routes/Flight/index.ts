import { cancelFlightBooking, getBookingDetails, getConfirmationFare, getFareRules, getFlightAirportList, getSeatConfirmationFare, getSeatMap, searchFlight } from "@/controllers/flight";
import { Router } from "express";

const flightRouter = Router();

//GET routes
flightRouter.get('/searchAirport', getFlightAirportList)
flightRouter.get('/searchFlight', searchFlight)
flightRouter.get('/getFareRules', getFareRules)
flightRouter.get('/getSeatConfirmationFare', getSeatConfirmationFare)
flightRouter.get('/getConfirmationFare', getConfirmationFare)
flightRouter.get('/getSeatMap', getSeatMap)
flightRouter.get('/getBookingDetails', getBookingDetails)
flightRouter.delete('/cancelFlightBooking', cancelFlightBooking)

export default flightRouter;