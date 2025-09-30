import { DefaultResponseBody } from "@/types/default";
import { Request, Response } from "express";
import Booking from "@/schemas/Booking";
import { Types } from "mongoose";
import dotenv from "dotenv";
import { BookingStatus, CompanyApproval } from "@/types/Bookings";

if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env" });
} else {
    dotenv.config({ path: ".env.local" });
}

export const updateBookingStatus = async (
    req: Request<any, any, {
        bookingId: string;
        status: BookingStatus;
    }>,
    res: Response<DefaultResponseBody<null>>
) => {
    const { bookingId, status } = req.body;
    const userId = req.user?.userId;

    if (!bookingId || !status) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Invalid booking ID or status."
            }
        });
        return;
    }

    const booking = await Booking.findOne({
        _id: new Types.ObjectId(bookingId),
        $or: [
            { "createdBy": new Types.ObjectId(userId) },
            { "userId": { $in: [new Types.ObjectId(userId)] } }
        ]
    });
    if (!booking) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "Booking not found."
            }
        });
        return;
    }

    booking.status = status;

    await booking.save();

    res.status(200).json({
        data: null,
        Status: {
            Code: 200,
            Message: "Booking status updated successfully."
        }
    });
}

export const updateCompanyApproval = async (
    req: Request<any, any, {
        bookingId: string;
        companyApproval: CompanyApproval;
    }>,
    res: Response<DefaultResponseBody<null>>
) => {
    const { bookingId, companyApproval } = req.body;
    const userId = req.user?.userId;

    if (!bookingId || companyApproval === undefined) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Invalid booking ID or company approval status."
            }
        });
        return;
    }

    const booking = await Booking.findOne({
        _id: new Types.ObjectId(bookingId),
        $or: [
            { "createdBy": new Types.ObjectId(userId) },
            { "userId": { $in: [new Types.ObjectId(userId)] } }
        ]
    });
    if (!booking) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "Booking not found."
            }
        });
        return;
    }

    booking.bookingDetails.companyApproval = companyApproval;

    await booking.save();

    res.status(200).json({
        data: null,
        Status: {
            Code: 200,
            Message: "Company approval status updated successfully."
        }
    });
}