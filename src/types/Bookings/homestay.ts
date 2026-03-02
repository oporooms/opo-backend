import { Orders } from "razorpay/dist/types/orders";
import { IUser } from "../user";
import { PaymentMode } from ".";

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

export interface CreateHomestayBookingRequest {
    traveller: Travellers,
    homestayId: string,
    units: number,
    checkIn: Date,
    checkOut: Date,
    adults: number,
    children: number,
    unitType: string,
    paymentMode: PaymentMode,
    price?: number,
}

export interface CreateHomestayBookingResponse {
    order: Orders.RazorpayOrder | null | undefined,
    user: IUser,
    bookingId: string
}
