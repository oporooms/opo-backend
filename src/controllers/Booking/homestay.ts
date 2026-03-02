import { CreateHomestayBookingRequest, CreateHomestayBookingResponse } from "@/types/Bookings/homestay";
import { DefaultResponseBody } from "@/types/default";
import { Request, Response } from "express";
import Booking from "@/schemas/Booking";
import { Types } from "mongoose";
import User from "@/schemas/User";
import axios from "axios";
import dotenv from "dotenv";
import { Bookings, BookingStatus, BookingType, CompanyApproval, PaymentMode, PaymentStatus } from "@/types/Bookings";
import dayjs from "dayjs";
import { Orders } from "razorpay/dist/types/orders";
import { IUser } from "@/types/user";
import Homestay from "@/schemas/Homestay/Homestay";

if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env" });
} else {
    dotenv.config({ path: ".env.local" });
}

export const createHomestayBooking = async (
    req: Request<any, any, CreateHomestayBookingRequest>,
    res: Response<DefaultResponseBody<CreateHomestayBookingResponse>>
) => {
    const { traveller, homestayId, units, checkIn, checkOut, adults, children, unitType, paymentMode } = req.body;

    const totalDays = Math.max(1, dayjs(checkOut).diff(dayjs(checkIn), 'day'));

    const existingBookings = await Booking.aggregate([
        {
            $match: {
                bookingType: BookingType.Homestay,
                'bookingDetails.ifHomeStayBooked.homestayId': new Types.ObjectId(homestayId)
            }
        },
        {
            $match: {
                $expr: {
                    $or: [
                        {
                            $and: [
                                { $lte: ["$bookingDetails.ifHomeStayBooked.checkIn", checkIn] },
                                { $gt: ["$bookingDetails.ifHomeStayBooked.checkOut", checkIn] }
                            ]
                        },
                        {
                            $and: [
                                { $lt: ["$bookingDetails.ifHomeStayBooked.checkIn", checkOut] },
                                { $gte: ["$bookingDetails.ifHomeStayBooked.checkOut", checkOut] }
                            ]
                        },
                        {
                            $and: [
                                { $gte: ["$bookingDetails.ifHomeStayBooked.checkIn", checkIn] },
                                { $lte: ["$bookingDetails.ifHomeStayBooked.checkOut", checkOut] }
                            ]
                        }
                    ]
                }
            }
        }
    ]);

    const homestay = await Homestay.findOne({ _id: new Types.ObjectId(homestayId) });

    if (!homestay) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "Homestay not found",
            }
        });
        return;
    }

    const selectedUnit = homestay.units.find((item) => item.type === unitType);

    if (!selectedUnit) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Selected unit type not available",
            }
        });
        return;
    }

    const totalBookedUnits = existingBookings.reduce((acc, curr) => acc + Number(curr?.bookingDetails?.ifHomeStayBooked?.units || 0), 0);
    const totalAvailableUnits = Math.max(0, Number(homestay.units.length) - totalBookedUnits);

    if (totalAvailableUnits < Number(units)) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: `Only ${totalAvailableUnits} units are available for selected dates.`,
            }
        });
        return;
    }

    const user = await User.findOne({ _id: new Types.ObjectId(String(req.user?.userId)) });
    const createdById = await User.findOne({ _id: new Types.ObjectId(String(req.user?.userId)) });

    if (!createdById) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "Unauthorized",
            }
        });
        return;
    }

    const cost = Number(selectedUnit.price) * Number(units) * totalDays;
    const tax = cost * 0.12;
    const total = Math.round(cost + tax);

    const obj: Bookings = {
        userId: [new Types.ObjectId(String(req.user?.userId))],
        bookingType: BookingType.Homestay,
        bookingDate: new Date(),
        bookingDetails: {
            companyApproval: CompanyApproval.Approved,
            ifHomeStayBooked: {
                homestayId: homestay._id,
                assignedUnits: [],
                units: Number(units),
                checkIn: new Date(String(checkIn)),
                checkOut: new Date(String(checkOut)),
                adults: +adults,
                childrens: +children,
                totalDays,
                unitType: selectedUnit.type,
            },
        },
        status: paymentMode === PaymentMode.onlinePay ? BookingStatus.PENDING : BookingStatus.BOOKED,
        payment: {
            mode: paymentMode,
            status: paymentMode === PaymentMode.onlinePay ? PaymentStatus.pending : PaymentStatus.success,
            cost,
            fee: +tax,
            total,
            transactionDetails: {
                date: null,
                id: '',
                mode: paymentMode,
                orderId: '',
            },
        },
        gstDetails: traveller?.gstDetails as Bookings['gstDetails'],
        createdBy: new Types.ObjectId(createdById._id.toString()),
        createdAt: new Date(),
        updatedAt: new Date()
    };

    if (paymentMode === PaymentMode.payByCompany) {
        const companyId = createdById.userRole === 'CADMIN' ? createdById._id : createdById.companyId;
        const companyWallet = await User.findOne({ _id: companyId as string });

        if (!companyWallet?.wallet || companyWallet.wallet < obj.payment.total) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Insufficient balance in company wallet",
                }
            });
            return;
        }

        obj.bookingDetails.companyApproval = createdById.userRole === 'EMPLOYEE' ? CompanyApproval.Pending : CompanyApproval.Approved;
        obj.payment.status = createdById.userRole === 'EMPLOYEE' ? PaymentStatus.pending : PaymentStatus.success;
        obj.status = createdById.userRole === 'EMPLOYEE' ? BookingStatus.PENDING : BookingStatus.BOOKED;
        obj.createdBy = new Types.ObjectId(String(companyId));
    }

    if (paymentMode === PaymentMode.payAtHotel) {
        obj.payment.status = PaymentStatus.pending;
        obj.status = BookingStatus.BOOKED;
    }

    const createdBooking = await Booking.insertOne({ ...obj });

    if (!createdBooking._id) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Failed to create booking",
            }
        });
        return;
    }

    let order: DefaultResponseBody<Orders.RazorpayOrder> | null = null;

    if (paymentMode === PaymentMode.onlinePay) {
        order = await axios.post<DefaultResponseBody<Orders.RazorpayOrder>>(`${process.env.SERVER_URL}/api/v1/payment/razorpay/createOrder`, {
            amount: total,
            currency: "INR",
            receipt: createdBooking._id.toString(),
        }, {
            headers: {
                Authorization: req.headers.authorization
            }
        }).then((r) => r.data);

        if (!order?.data?.id) {
            await Booking.findByIdAndUpdate(createdBooking._id, {
                $set: {
                    status: BookingStatus.CANCELLED,
                    'payment.status': PaymentStatus.declined
                }
            });

            res.status(500).json({
                data: null,
                Status: {
                    Code: 500,
                    Message: "Failed to initialize payment order",
                }
            });
            return;
        }

        await Booking.findByIdAndUpdate(createdBooking._id, {
            $set: {
                'payment.transactionDetails.orderId': order.data.id,
                'payment.transactionDetails.id': order.data.id,
                'payment.transactionDetails.mode': PaymentMode.onlinePay,
                status: BookingStatus.PENDING,
                'payment.status': PaymentStatus.pending,
            }
        });
    }

    res.status(200).json({
        data: {
            order: order?.data,
            bookingId: createdBooking._id.toString(),
            user: user as IUser,
        },
        Status: {
            Code: 200,
            Message: "Homestay booking initialized successfully",
        }
    });
};

export const getHomestayBookings = async (
    req: Request,
    res: Response<DefaultResponseBody<Bookings[]>>
) => {
    const userId = req.user?.userId;

    const bookings = await Booking.aggregate([
        {
            $match: {
                $or: [
                    { userId: { $in: [new Types.ObjectId(String(userId))] } },
                    { createdBy: new Types.ObjectId(String(userId)) }
                ],
                bookingType: BookingType.Homestay
            }
        },
        {
            $lookup: {
                from: 'Homestay',
                localField: 'bookingDetails.ifHomeStayBooked.homestayId',
                foreignField: '_id',
                as: 'homestayDetails'
            }
        },
        {
            $unwind: {
                path: '$homestayDetails',
                preserveNullAndEmptyArrays: true
            }
        },
    ]);

    if (!bookings) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "No bookings found",
            }
        });
        return;
    }

    res.status(200).json({
        data: bookings,
        Status: {
            Code: 200,
            Message: "Homestay bookings retrieved successfully"
        }
    });
};
