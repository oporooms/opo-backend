import { ObjectId } from "mongoose";
import { Passengers } from "./Flight/Booking";
import { Baggage, Meal, Seat } from "./Flight/SeatMap";
import { FareConfirmation } from "./Flight/FareConfirmation";
import { IGetBookingDetailsResponse } from "./Flight/GetBookingDetails";
import { Passenger } from "./Bus/Passenger";
import { BlockSeat } from "./Bus/BlockSeat";
import { IGetBookingDetails } from "./Bus/GetBookingDetails";


export enum BookingStatus {
    PENDING = "pending",
    BOOKED = "booked",
    CANCELLED = "cancelled",
}

export enum PaymentStatus {
    pending = "pending",
    success = "success",
    declined = "declined",
}

const enum BookingType {
    Hotel = "Hotel",
    Flight = "Flight",
    Bus = "Bus",
    Train = "Train",
    Package = "Package"
}

const enum CompanyApproval {
    Pending = "Pending",
    Approved = "Approved",
    Rejected = "Rejected"
}

export enum PaymentMode {
    payAtHotel = "Pay at hotel",
    payByCompany = "Pay by company",
    onlinePay = "Online Pay",
}

interface HotelDetails {
    hotelId: ObjectId,
    // hotelOwnerId: ObjectId,
    assignedRooms: [],
    rooms: number,
    adults: number,
    childrens: number,
    checkIn: Date,
    checkOut: Date,
    totalDays: number
}
interface FlightDetails {
    travellers: Passengers[],
    selectedMeal: Meal[],
    selectedBaggage: Baggage[],
    selectedSeats: Seat[],
    fareConfirmation: FareConfirmation,
    bookingResult: IGetBookingDetailsResponse
}
interface BusDetails {
    travellers: Passenger[],
    blockSeat: BlockSeat,
    bookingResult: IGetBookingDetails
}
interface TrainDetails { }
interface PackageDetails {
    packageId: ObjectId,
    packageName: string,
    tourOperatorId: ObjectId,
    tourOperatorName?: string,
    description?: string,
    destinations: string[],
    itinerary: {
        day: number,
        date?: Date,
        title?: string,
        description?: string,
        activities?: string[],
        mealsIncluded?: ("Breakfast" | "Lunch" | "Dinner")[],
        overnightAt?: string
    }[],
    travel: {
        departureDate: Date,
        returnDate: Date,
        durationDays: number,
        departureCity?: string,
        returnCity?: string,
        transfersIncluded?: boolean
    },
    travellers: {
        adults: number,
        children: number,
        infants?: number,
        details?: {
            firstName: string,
            lastName: string,
            age?: number,
            type: "ADULT" | "CHILD" | "INFANT"
        }[]
    },
    accommodation?: {
        hotelId?: ObjectId,
        name?: string,
        starRating?: number,
        roomType?: string,
        mealPlan?: string,
        rooms?: number,
        checkIn?: Date,
        checkOut?: Date,
        nights?: number,
        address?: string
    },
    transportation?: {
        included: string[],
        flightSegments?: {
            carrier?: string,
            flightNumber?: string,
            from: string,
            to: string,
            departAt: Date,
            arriveAt: Date,
            pnr?: string
        }[],
        trainSegments?: {
            operator?: string,
            trainNumber?: string,
            from: string,
            to: string,
            departAt: Date,
            arriveAt: Date
        }[],
        busSegments?: {
            operator?: string,
            from: string,
            to: string,
            departAt: Date,
            arriveAt: Date
        }[],
        privateTransfers?: boolean
    },
    inclusions: string[],
    exclusions: string[],
    addOns?: {
        id?: ObjectId | string,
        name: string,
        description?: string,
        price: number,
        currency?: string,
        selected?: boolean
    }[],
    specialRequests?: string[],
    pricing: {
        currency: string,
        base: number,
        taxes?: number,
        discounts?: number,
        fees?: number,
        perPerson?: {
            adult?: number,
            child?: number,
            infant?: number
        },
        total: number
    },
    payment?: {
        depositPaid?: number,
        balanceDue?: number,
        dueDate?: Date,
        paidInFull?: boolean
    },
    policies?: {
        cancellation?: string,
        amendment?: string,
        terms?: string
    },
    documents?: {
        voucherNumber?: string,
        confirmationCodes?: string[]
    },
    notes?: string,
    lastUpdated?: Date
}
interface OutSideHotelDetails {
    name: string
    address: string
    checkIn: Date
    checkOut: Date
    totalDays: number
    guests: {
        adults: number,
        childrens?: number,
    },
    rooms: number,
}

export interface Bookings {
    userId: ObjectId[] | string[],
    bookingId: string,
    bookingType: BookingType,
    bookingDate: Date,
    bookingDetails: {
        companyApproval: CompanyApproval,
        ifHotelBooked: HotelDetails,
        ifFlightBooked: FlightDetails,
        ifBusBooked: BusDetails,
        ifTrainBooked: TrainDetails,
        ifPackageBooked: PackageDetails,
        ifOutSideHotelBooked: OutSideHotelDetails
    },
    status: BookingStatus,
    createdBy: ObjectId | string,
    gstDetails: {
        gstNo: string,
        gstName: string,
        gstAddress: {
            address: string,
            pincode: string,
            state: string,
        }
    },
    payment: {
        cost: number,
        fee: number,
        mode: PaymentMode,
        status: PaymentStatus,
        total: number,
        transactionDetails: {
            date: Date | null,
            id: string,
            mode: PaymentMode,
            orderId: string,
        }
    },
    createdAt: Date,
    updatedAt: Date,
}