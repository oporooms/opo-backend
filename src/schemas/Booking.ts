import { Bookings } from "@/types/oldcode/Booking";
import { Schema, model } from "mongoose";

// Lightweight, robust schema matching the provided JSON Schema while
// keeping deeply nested third-party payloads flexible (Mixed) for forward-compat.
// Required root fields: bookingDate, bookingDetails, bookingType, createdBy, payment, userId

const GstAddressSchema = new Schema(
    {
        address: { type: String, default: "" },
        pincode: { type: String, default: "" },
        state: { type: String, default: "" },
    },
    { _id: false }
);

const GstDetailsSchema = new Schema(
    {
        gstNo: { type: String, default: "" },
        gstName: { type: String, default: "" },
        gstAddress: { type: GstAddressSchema, default: () => ({}) },
    },
    { _id: false }
);

const PaymentTxnSchema = new Schema(
    {
        date: { type: Date, default: null },
        id: { type: String, default: "" },
        mode: { type: String, default: "" },
        orderId: { type: String, default: "" },
    },
    { _id: false }
);

const PaymentSchema = new Schema(
    {
        cost: {
            type: Number,
            required: true,
            set: (v: any) => (v === null || v === undefined || v === "" ? 0 : Number(v)),
        },
        fee: {
            type: Number,
            required: true,
            set: (v: any) => (v === null || v === undefined || v === "" ? 0 : Number(v)),
        },
        mode: { type: String, required: true },
        status: { type: String, required: true },
        total: {
            type: Number,
            required: true,
            set: (v: any) => (v === null || v === undefined || v === "" ? 0 : Number(v)),
        },
        transactionDetails: { type: PaymentTxnSchema, default: () => ({}) },
    },
    { _id: false }
);

// Hotel-specific shapes are reasonably stable in our app, model them strictly.
const HotelGuestsGstSchema = new Schema(
    {
        gstAddress: { type: GstAddressSchema, default: () => ({}) },
        gstName: { type: String, default: "" },
        gstNo: { type: String, default: "" },
    },
    { _id: false }
);

const HotelGuestSchema = new Schema(
    {
        _id: { type: Schema.Types.ObjectId, default: undefined },
        fullname: { type: String, required: true },
        address: { type: String, default: "" },
        companyId: { type: Schema.Types.Mixed, default: null },
        contact1: { type: String, default: "" },
        dob: { type: Date, default: null },
        email: { type: String, default: "" },
        gender: { type: String, default: "" },
        gstDetails: { type: HotelGuestsGstSchema, default: () => ({}) },
        PAN: { type: String, default: "" },
        panNo: { type: String, default: "" },
        status: { type: String, default: "" },
        userRole: { type: String, default: "" },
    },
    { _id: false }
);

const AssignedRoomSchema = new Schema(
    {
        _id: { type: Schema.Types.ObjectId, required: true, ref: "Room" },
        hotelId: { type: Schema.Types.ObjectId, required: true, ref: "Hotel" },
        hotelOwnerId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
        number: { type: String, required: true },
        status: { type: Boolean, required: true },
        type: { type: String, required: true },
    },
    { _id: false }
);

const GuestsCountsSchema = new Schema(
    {
        adults: { type: Number, required: true },
        childrens: { type: Number, required: true },
    },
    { _id: false }
);

const HotelAddressSchema = new Schema(
    {
        City: { type: String, default: "" },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        Locality: { type: String, default: "" },
        place_id: { type: String, default: "" },
        placeId: { type: String, default: "" },
    },
    { _id: false }
);

const HotelRoomInfoSchema = new Schema(
    {
        amenities: { type: [String], default: [] },
        fee: { type: String, default: "" },
        id: { type: Number, required: true },
        photos: { type: [String], default: [] },
        price: { type: String, default: "" },
        regularPrice: { type: String, default: "" },
        type: { type: String, required: true },
    },
    { _id: false }
);

const HotelDetailsSchema = new Schema(
    {
        _id: { type: String, required: true },
        address: { type: HotelAddressSchema, required: true },
        Address: { type: String, default: "" },
        amenities: { type: [String], default: [] },
        availableRooms: { type: Number, default: 0 },
        customAddress: { type: String, default: "" },
        desc: { type: String, default: "" },
        "Google Rating": { type: Schema.Types.Mixed, default: null },
        "Hotel Email": { type: String, default: "" },
        hotelOwnerId: { type: String, required: true },
        hotelUId: { type: String, required: true },
        location: {
            type: new Schema(
                {
                    coordinates: { type: [Number], default: [] },
                    type: { type: String, default: "Point" },
                },
                { _id: false }
            ),
            required: true,
        },
        name: { type: String, required: true },
        Name: { type: String, default: "" },
        "Owner Contact": { type: Schema.Types.Mixed, default: null },
        "Owner Name": { type: Schema.Types.Mixed, default: null },
        "Phone Reception": { type: Schema.Types.Mixed, default: null },
        photos: { type: [String], default: [] },
        rooms: { type: [HotelRoomInfoSchema], default: [] },
        status: { type: String, default: "" },
    },
    { _id: false }
);

const IfHotelBookedSchema = new Schema(
    {
        assignedRooms: { type: [AssignedRoomSchema], default: null },
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },
        guests: { type: GuestsCountsSchema, required: true },
        hotelGuests: { type: [HotelGuestSchema], required: true, default: [] },
        hotelId: { type: Schema.Types.ObjectId, required: true }, // ObjectId or string
        hotelOwnerId: { type: Schema.Types.ObjectId, required: true }, // ObjectId or string
        rooms: { type: Number, required: true },
        roomType: { type: String, required: true },
        totalDays: { type: Number, required: true },
    },
    { _id: false }
);

// Bus and Flight payloads are large vendor responses; store as flexible subdocs
const IfBusBookedSchema = new Schema(
    {
        blockSeat: { type: Schema.Types.Mixed },
        cancelDetails: { type: Schema.Types.Mixed },
        otherDetails: { type: Schema.Types.Mixed },
        travellers: { type: [Schema.Types.Mixed], default: [] },
    },
    { _id: false, strict: false }
);

const IfFlightBookedSchema = new Schema(
    {
        otherDetails: { type: Schema.Types.Mixed },
        passengers: { type: [Schema.Types.Mixed], default: [] },
        selectedBaggage: { type: [Schema.Types.Mixed], default: null },
        selectedMeal: { type: [Schema.Types.Mixed], default: null },
    },
    { _id: false, strict: false }
);

const BookingDetailsSchema = new Schema(
    {
        companyApproval: { type: String, default: null },
        status: { type: String, required: true },
        ifBusBooked: { type: IfBusBookedSchema, default: null },
        ifFlightBooked: { type: IfFlightBookedSchema, default: null },
        ifHotelBooked: { type: IfHotelBookedSchema, default: undefined },
        price: { type: String, default: "" },
    },
    { _id: false, strict: false }
);

const BookingSchema = new Schema<Bookings>(
    {
        bookingId: { type: String, default: "" },
        bookingType: { type: String, required: true }, // e.g., 'bus' | 'flight' | 'hotel'
        bookingDate: { type: Date, required: true, default: () => new Date() },
        bookingDetails: { type: BookingDetailsSchema, required: true },

        createdBy: { type: Schema.Types.Mixed, required: true }, // ObjectId or string per JSON schema
        gstDetails: { type: GstDetailsSchema, default: null },
        payment: { type: PaymentSchema, required: true },
        userId: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Validation to mirror required root fields from the provided JSON Schema
BookingSchema.pre("validate", function (next) {
    const self = this as any;
    const required = [
        "bookingDate",
        "bookingDetails",
        "bookingType",
        "createdBy",
        "payment",
        "userId",
    ];
    for (const field of required) {
        if (
            self[field] === undefined ||
            self[field] === null ||
            (typeof self[field] === "string" && self[field].trim() === "") ||
            (Array.isArray(self[field]) && self[field].length === 0)
        ) {
            self.invalidate(field, `${field} is required`);
        }
    }
    next();
});

// Helpful indexes
BookingSchema.index({ bookingDate: -1 });
BookingSchema.index({ bookingType: 1, "bookingDetails.status": 1 });
BookingSchema.index({ userId: 1 });

export default model<Bookings>("Booking", BookingSchema, "Booking");