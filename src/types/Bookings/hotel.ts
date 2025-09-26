import { Orders } from "razorpay/dist/types/orders"
import { IUser } from "../user"
import { PaymentMode } from "."

export interface Travellers {
    email: string,
    fullname: string,
    phone: string,
    address: string,
    dob: Date,
    gender: string,
    gstDetails?: {
        gstNo?: string,
        gstName?: string,
        gstAddress: {
            address?: string,
            state?: string,
            pincode?: string
        }
    },
    panNo?: string,
}

export interface CreateHotelBookingRequest {
    traveller: Travellers,
    userId: IUser['_id'],
    createdBy: IUser['_id'],
    hotelId: string,
    rooms: number,
    checkIn: Date,
    checkOut: Date,
    adults: number,
    children: number,
    roomType: string,
    paymentMode: PaymentMode,
    price: number,
}

export interface CreateHotelBookingResponse {
    order: Orders.RazorpayOrder | null | undefined, 
    user: IUser, 
    bookingId: string
}