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
import { CreateBdsdHotelBookingRequest, CreateBdsdHotelBookingResponse } from "@/types/Bookings/bdsdHotel";
import { BlockRoomResponse } from "@/types/BdsdHotel/BlockRoom";

if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env" });
} else {
    dotenv.config({ path: ".env.local" });
}

export const createBdsdHotelBooking = async (
    req: Request<any, any, CreateBdsdHotelBookingRequest>,
    res: Response<DefaultResponseBody<CreateBdsdHotelBookingResponse>>
) => {

    const { travellers, paymentMode, SearchTokenId, HotelCode, HotelName, ResultIndex, NoOfRooms, RoomIndex } = req.body;

    const blockHotel = await axios.post<DefaultResponseBody<BlockRoomResponse>>(`${process.env.SERVER_URL}/api/v1/bdsdHotel/blockRoom`, {
        UserIp: '122.161.64.143',
        ResultIndex: String(ResultIndex),
        HotelCode: Number(HotelCode),
        HotelName: String(HotelName),
        NoOfRooms: NoOfRooms || 1,
        HotelRoomsDetails: [{ RoomIndex: Number(RoomIndex || 1) }],
        SearchTokenId: String(SearchTokenId)
    }, {
        headers: {
            'Authorization': req.headers.authorization
        }
    }).then(res => res.data).catch(err => {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Failed to block hotel room",
            }
        });
        return null;
    });

    console.log("🚀 ~ file: bdsdHotel.ts:58 ~ createBdsdHotelBooking ~ blockHotel:", blockHotel)

    if (!blockHotel || blockHotel.Status.Code !== 200 || !blockHotel.data) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: blockHotel ? blockHotel.Status.Message : "Failed to block hotel room",
            }
        });
        return;
    }

    const user = await User.findOne({ _id: new Types.ObjectId(String(req.user?.userId)) });
    console.log("user", user)
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

    const total = blockHotel.data.Result?.HotelRoomsDetails?.find(i => Number(i.RoomIndex) == Number(RoomIndex))?.Price?.RoomPrice || 0
    const fee = blockHotel.data.Result?.HotelRoomsDetails?.[0]?.Price?.Tax || 0

    console.log("total, fee", total, fee)
    console.log("hotelRoomsDetails", blockHotel.data.Result?.HotelRoomsDetails)

    const totalAmount = blockHotel.data.Result?.HotelRoomsDetails?.find(i => Number(i.RoomIndex) == Number(RoomIndex))?.Price?.PublishedPrice || 0;

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
            ifBdsdHotelBooked: {
                blockHotel: blockHotel.data
            },
        },
        status: BookingStatus.BOOKED,
        payment: {
            mode: paymentMode,
            status: PaymentStatus.pending,
            cost: +total,
            fee: +fee,
            total: Math.round(totalAmount),
            transactionDetails: {
                date: new Date(),
                id: order?.data.data?.id || '',
                mode: PaymentMode.onlinePay,
                orderId: order?.data.data?.id || '',
            },
        },
        gstDetails: travellers?.gstDetails as Bookings['gstDetails'],
        createdBy: new Types.ObjectId(createdById._id.toString()),
        createdAt: new Date(),
        updatedAt: new Date()
    }

    if (paymentMode === PaymentMode.payByCompany) {
        const companyId = createdById.userRole === 'CADMIN' ? createdById._id : createdById.companyId;

        console.log("companyId", companyId)

        const companyWallet = await User.findOne({ _id: companyId as string });

        console.log("companyWallet", companyWallet)

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

    if (paymentMode === PaymentMode.onlinePay) {
        obj.createdBy = new Types.ObjectId(String(createdById?._id));
        obj.status = BookingStatus.BOOKED;
        obj.payment.transactionDetails = {
            ...obj.payment.transactionDetails,
            mode: PaymentMode.onlinePay
        };
    }

    const newBooking = await Booking.insertOne({
        ...obj
    })

    if (!newBooking._id) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Failed to create booking",
            }
        });
        return;
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