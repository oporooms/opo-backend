// src/types/Booking.ts

import { ObjectId } from "mongodb";
import { IHotel } from "@/types/hotel";
import { IUser } from "@/types/user";
import { IRooms, RoomVarietyTypes } from "@/types/rooms";
import { Passenger } from "../Bus/Passenger";
import { IGetBookingDetails } from "../Bus/GetBookingDetails";
import { Passengers } from "../Flight/Booking";
import { FareConfirmation } from "../Flight/FareConfirmation";
import { IGetBookingDetailsResponse } from "../Flight/GetBookingDetails";
import { BlockSeat } from "../Bus/BlockSeat";
import { Travellers } from "../Hotel/Travellers";
import { Baggage, Meal } from "../Flight/SeatMap";

export enum BookingStatus {
  pending = "pending",
  booked = "booked",
  cancelled = "cancelled",
}

export enum CompanyApproval {
  pending = "pending",
  approved = "approved",
  declined = "declined",
}

export enum PaymentStatus {
  pending = "pending",
  success = "success",
  declined = "declined",
}

export enum BookingType {
  Hotel = "Hotel",
  Flight = "Flight",
  Train = "Train",
  Bus = "Bus",
  Package = "Package",
}

export enum TransactionMode {
  online = "online",
  cash = "cash",
}

export enum PaymentMode {
  payAtHotel = "Pay at hotel",
  payByCompany = "Pay by company",
  onlinePay = "Online Pay",
}

export interface Room {
  placeId?: string;
  lat?: number;
  lng?: number;
  checkIn?: Date;
  checkOut?: Date;
  rooms?: number;
  adults?: number;
  childrens?: number;
  roomData: RoomVarietyTypes;
}

export interface Hotel {
  _id?: string;
  hotelOwnerId?: string;
  photos: string[];
  name: string;
  address: {
    lat: string;
    lng: string;
    City?: string;
    Locality?: string;
    placeId?: string;
  };
  rooms: IRooms[];
  status: "pending" | "approved" | "declined";
  amenities: string[];
}

export interface AssignedRooms {
  _id: string;
  photos: string[];
  number: number;
  type: string;
}

export interface Bookings {
  _id?: ObjectId | string;
  userId: string[] | ObjectId[];
  companyId?: string;
  bookingId?: string | ObjectId;
  bookingType: BookingType;
  bookingDate: Date;
  userDetails?: IUser[];
  bookingDetails: {
    ifHotelBooked?:
    | {
      assignedRooms: AssignedRooms[];
      rooms: number;
      checkIn: Date;
      checkOut: Date;
      guests: {
        adults: number;
        childrens?: number;
      };
      roomType: string;
      totalDays: number;
      otherDetails?: Record<string, any>;
      totalRating?: number;
      hotelOwnerId: string | ObjectId;
      hotelId: string | ObjectId;
      hotelDetails?: IHotel;
      HotelOwnerDetails?: IUser;
      hotelGuests: Travellers[];
    }
    | null;
    ifBusBooked?:
    | {
      travellers: Passenger[];
      otherDetails?: IGetBookingDetails;
      blockSeat?: BlockSeat;
    }
    | null;
    ifFlightBooked?:
    | {
      passengers: Passengers[];
      selectedMeal: Meal[];
      selectedBaggage: Baggage[];
      otherDetails?: IGetBookingDetailsResponse | FareConfirmation;
    }
    | null;
    ifTrainBooked?: {} | null;
    ifOutSideHotelBooked?: {
      assignedRooms: AssignedRooms[];
      name: string;
      address: string;
      checkIn: Date;
      checkOut: Date;
      guests: {
        adults: number;
        childrens?: number;
      };
      roomType: string;
      totalDays: number;
      rooms: number;
    };
    status: BookingStatus;
    companyApproval: CompanyApproval | null;
  };
  payment: {
    mode: PaymentMode;
    status: PaymentStatus;
    cost: string | number;
    fee: string | number;
    total: string | number;
    transactionDetails: {
      id?: string;
      orderId?: string;
      date?: Date;
      mode?: TransactionMode;
    };
  };
  gstDetails: {
    gstNo: string;
    gstName: string;
    gstAddress: {
      address: string;
      state: string;
      pincode: string;
    };
  };
  createdBy: ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingFields extends Bookings {
  viewRooms: string;
  actions: string;
  viewDetails: string;
}
