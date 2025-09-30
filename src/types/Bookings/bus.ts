import { Orders } from "razorpay/dist/types/orders"
import { IUser } from "../user"
import { PaymentMode } from "."
import { Passenger } from "../Bus/BlockSeat"

export interface CreateBusBookingRequest {
    travellers: Passenger[],
    userId: string,
    createdBy: string,
    paymentMode: PaymentMode,
    price?: string,
    ResultIndex: string,
    SearchTokenId: string,
    BoardingPointId: string,
    DroppingPointId: string,
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
    },
    Seats: string[]
}

export interface CreateBusBookingResponse {
    order: Orders.RazorpayOrder | null | undefined,
    user: IUser,
    bookingId: string
}