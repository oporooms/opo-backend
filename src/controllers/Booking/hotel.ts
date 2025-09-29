import { CreateHotelBookingRequest, CreateHotelBookingResponse } from "@/types/Bookings/hotel";
import { DefaultResponseBody } from "@/types/default";
import { Request, Response } from "express";
import Booking from "@/schemas/Booking";
import { Types } from "mongoose";
import Hotel from "@/schemas/Hotel/Hotel";
import Room from "@/schemas/Room";
import User from "@/schemas/User";
import axios from "axios";
import dotenv from "dotenv";
import { Bookings, BookingStatus, BookingType, CompanyApproval, PaymentMode, PaymentStatus } from "@/types/Bookings";
import dayjs from "dayjs";
import { Orders } from "razorpay/dist/types/orders";
import { IUser } from "@/types/user";

if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env" });
} else {
    dotenv.config({ path: ".env.local" });
}

export const createHotelBooking = async (
    req: Request<any, any, CreateHotelBookingRequest>,
    res: Response<DefaultResponseBody<CreateHotelBookingResponse>>
) => {
    const { traveller, hotelId, rooms, checkIn, checkOut, adults, children, roomType, paymentMode, price } = req.body;

    console.log({
        traveller, hotelId, rooms, checkIn, checkOut, adults, children, roomType, paymentMode, price
    })

    console.log(req.user?.userId)

    const isAlreadyBooked = await Booking.aggregate([
        { $match: { 'bookingDetails.ifHotelBooked.hotelId': new Types.ObjectId(hotelId) } },
        {
            $match: {
                $expr: {
                    $or: [
                        {
                            $and: [
                                { $lte: ["$bookingDetails.ifHotelBooked.checkIn", checkIn] },
                                { $gt: ["$bookingDetails.ifHotelBooked.checkOut", checkIn] }
                            ]
                        },
                        {
                            $and: [
                                { $lt: ["$bookingDetails.ifHotelBooked.checkIn", checkOut] },
                                { $gte: ["$bookingDetails.ifHotelBooked.checkOut", checkOut] }
                            ]
                        },
                        {
                            $and: [
                                { $gte: ["$bookingDetails.ifHotelBooked.checkIn", checkIn] },
                                { $lte: ["$bookingDetails.ifHotelBooked.checkOut", checkOut] }
                            ]
                        }
                    ]
                }
            }
        },
        { $limit: 1 }
    ])

    const totalRoomsBooked = isAlreadyBooked?.reduce((acc, curr) => acc + curr.bookingDetails.ifHotelBooked.rooms, 0) || 0

    const hotel = await Hotel.findOne({ _id: new Types.ObjectId(hotelId) })

    if (!hotel) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "Hotel not found",
            }
        });
        return;
    }

    const room = await Room.findOne({ type: roomType, hotelId: hotel?._id })
    const totalRooms = await Room.countDocuments({ hotelId: hotel?._id, type: roomType })

    const totalRoomsAvailable = totalRooms - totalRoomsBooked;

    console.log({
        isAlreadyBooked,
        totalRoomsBooked,
        totalRoomsAvailable,
        totalRooms,
    })

    // if (totalRoomsAvailable < rooms) {
    //     res.status(400).json({
    //         data: null,
    //         Status: {
    //             Code: 400,
    //             Message: `Only ${totalRoomsAvailable} rooms are available for the selected type and dates.`,
    //         }
    //     });
    //     return;
    // }

    const user = await User.findOne({ _id: new Types.ObjectId(String(req.user?.userId)) });
    console.log({ user })
    const createdById = await User.findOne({ _id: new Types.ObjectId(String(req.user?.userId)) });

    console.log({ createdById })

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

    const totalAmount = Number(hotel.rooms.find((i) => i.type === roomType)?.price);
    const totalDays = dayjs(checkOut).diff(dayjs(checkIn), 'day');

    const order = paymentMode == PaymentMode.onlinePay ? await axios.post<DefaultResponseBody<Orders.RazorpayOrder>>(`${process.env.SERVER_URL}/api/v1/payment/razorpay/createOrder`, {
        amount: totalAmount,
        currency: "INR",
        receipt: `receipt_order_${Math.random().toString(36).substring(2, 15)}`,
    }, {
        headers: {
            'Authorization': req.headers.authorization
        }
    }) : null;

    const obj: Bookings = {
        userId: [new Types.ObjectId(String(req.user?.userId))],
        bookingType: BookingType.Hotel,
        bookingDate: new Date(),
        bookingDetails: {
            companyApproval: CompanyApproval.Approved,
            ifHotelBooked: {
                hotelId: hotel?._id,
                assignedRooms: [],
                rooms: Number(rooms),
                checkIn: new Date(String(checkIn)),
                checkOut: new Date(String(checkOut)),
                adults: +adults,
                childrens: +children,
                totalDays,
                roomType: room?.type || 'Standard',
            },
        },
        status: BookingStatus.BOOKED,
        payment: {
            mode: paymentMode,
            status: PaymentStatus.pending,
            cost: +totalAmount,
            fee: 0,
            total: Math.round(totalAmount),
            transactionDetails: {
                date: new Date(),
                id: order?.data.data?.id || '',
                mode: PaymentMode.onlinePay,
                orderId: order?.data.data?.id || '',
            },
        },
        gstDetails: traveller?.gstDetails as Bookings['gstDetails'],
        createdBy: new Types.ObjectId(createdById._id.toString()),
        createdAt: new Date(),
        updatedAt: new Date()
    }

    if (paymentMode === PaymentMode.payByCompany) {
        const companyId = createdById.userRole === 'CADMIN' ? createdById._id : createdById.companyId;

        const companyWallet = await User.findOne({ _id: companyId as string });

        if (!companyWallet?.wallet || companyWallet?.wallet < obj.payment.total) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Insufficient balance in company wallet",
                }
            });
            return;
        }

        obj.bookingDetails.companyApproval = createdById?.userRole === 'EMPLOYEE' ? CompanyApproval.Pending : CompanyApproval.Approved;

        obj.payment.status = createdById?.userRole === 'EMPLOYEE' ? PaymentStatus.pending : PaymentStatus.success;

        obj.status = createdById?.userRole === 'EMPLOYEE' ? BookingStatus.PENDING : BookingStatus.BOOKED;
        obj.createdBy = new Types.ObjectId(String(companyId));
    }

    const newBooking = await Booking.insertOne({
        ...obj
    })

    if (paymentMode === PaymentMode.onlinePay) {
        obj.createdBy = new Types.ObjectId(String(createdById?._id));
        obj.status = BookingStatus.BOOKED;
        obj.payment.transactionDetails = {
            ...obj.payment.transactionDetails,
            mode: PaymentMode.onlinePay
        };
    }

    res.status(200).json({
        data: {
            order: order?.data.data,
            bookingId: newBooking?._id.toString(),
            user: user as IUser,
        },
        Status: {
            Code: 200,
            Message: "Hotel booked successfully",
        }
    });
}