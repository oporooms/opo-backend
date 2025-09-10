import { Dayjs } from "dayjs"

export interface Travellers {
    _id?: string,
    username?: string,
    email: string,
    fullname: string,
    contact1: string,
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