import { blockBusSeat, bookBusSeat, cancelBooking, getBoardingPoints, getBookingDetails, getBusList, getSeatMap, searchBuses } from "@/controllers/bus";
import { Router } from "express";

const busRouter = Router();

//GET routes
busRouter.get('/getBusList', getBusList)
busRouter.get('/searchBuses', searchBuses)
busRouter.get('/getSeatMap', getSeatMap)
busRouter.get('/getBoardingPoints', getBoardingPoints)
busRouter.post('/blockBusSeat', blockBusSeat)
busRouter.post('/bookBusSeat', bookBusSeat)
busRouter.get('/getBookingDetails', getBookingDetails)
busRouter.delete('/cancelBooking', cancelBooking)

export default busRouter;