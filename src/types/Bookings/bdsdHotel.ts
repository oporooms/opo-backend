import { Orders } from "razorpay/dist/types/orders"
import { IUser } from "../user"
import { PaymentMode } from "."

export interface Travellers {
    email: string,
    phone: string,
    address: string,
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

export interface CreateBdsdHotelBookingRequest {
    travellers: Travellers,
    paymentMode: PaymentMode,
    ResultIndex: string | number,
    HotelCode: string,
    HotelName: string,
    NoOfRooms: number,
    RoomIndex: number,
    SearchTokenId: string,
}

export interface CreateBdsdHotelBookingResponse {
    order: Orders.RazorpayOrder | null | undefined, 
    user: IUser, 
    bookingId: string
}