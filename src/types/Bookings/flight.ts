import { Types } from "mongoose";
import { Passengers } from "../Flight/Booking";
import { PaymentMode } from ".";
import { Baggage, Meal, SeatList } from "../Flight/SeatMap";
import { Orders } from "razorpay/dist/types/orders";
import { IUser } from "../user";

export interface CreateFlightBookingRequest {
    travellers: Passengers[],
    userId: Types.ObjectId,
    createdBy: Types.ObjectId,
    paymentMode: PaymentMode,
    price?: number,
    seat: SeatList[],
    seatReturn: SeatList[],
    meal: Meal[],
    mealReturn: Meal[],
    baggage: Baggage[],
    baggageReturn: Baggage[],
    fareId: string,
    fareReturnId: string,
    SearchTokenId: string,
    JourneyType: string,
    otherDetails: {
        email: string,
        phone: string,
        address1: string,
        address2: string,
        city: string,
        gstDetails?: {
            gstNo?: string,
            gstName?: string,
            gstAddress: {
                address?: string,
                state?: string,
                pincode?: string
            }
        },
    }
}

export interface CreateFlightBookingResponse {
    order: Orders.RazorpayOrder | null | undefined,
    user: IUser,
    bookingId: string
}