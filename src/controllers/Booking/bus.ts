import Booking from "@/schemas/Booking";
import User from "@/schemas/User";
import { Bookings, BookingStatus, BookingType, CompanyApproval, PaymentMode, PaymentStatus } from "@/types/Bookings";
import { CreateBusBookingRequest, CreateBusBookingResponse } from "@/types/Bookings/bus";
import { BlockSeat, Passenger } from "@/types/Bus/BlockSeat";
import { DefaultResponseBody } from "@/types/default";
import { IUser } from "@/types/user";
import axios from "axios";
import dotenv from "dotenv";
import { Request, Response } from "express";
import { Types } from "mongoose";
import { Orders } from "razorpay/dist/types/orders";

if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env" });
} else {
    dotenv.config({ path: ".env.local" });
}

export const createBusBooking = async (
    req: Request<any, any, CreateBusBookingRequest>,
    res: Response<DefaultResponseBody<CreateBusBookingResponse>>
) => {
    const { travellers, otherDetails, userId, createdBy, paymentMode, price, ResultIndex, SearchTokenId, BoardingPointId, DroppingPointId, Seats } = req.body;

    let blockBusSeat = await axios.post<DefaultResponseBody<BlockSeat>>(
        `${process.env.SERVER_URL}/api/v1/bus/blockBusSeat`,
        {
            ResultIndex,
            SearchTokenId,
            BoardingPointId,
            DroppingPointId,
            Passenger: travellers?.map((t, i) => ({
                ...t,
                Seat: Seats[i],
            })),
        }
    ).then(response => response.data)
        .catch(error => {
            res.status(500).json({ data: null, Status: { Code: 500, Message: "Failed to fetch fare and seat details" } });
            return null;
        });

    if (!blockBusSeat || blockBusSeat.Status.Code !== 200) {
        res.status(500).json({ data: null, Status: { Code: 500, Message: "Failed to block bus seat" } });
        return;
    }

    const user = await User.findOne({ _id: new Types.ObjectId(req.user?.userId) });
    const createdById = await User.findOne({ _id: new Types.ObjectId(req.user?.userId) });

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

    const totalAmount = blockBusSeat?.data?.Result?.Passenger?.reduce((acc, passenger) => acc + Number(passenger.Seat.Price.PublishedPrice), 0) || 0;

    const fee = blockBusSeat?.data?.Result?.Passenger?.reduce((acc, passenger) => acc + Number(passenger.Seat.Price.Tax), 0) || 0

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
        bookingType: BookingType.Bus,
        bookingDate: new Date(),
        bookingDetails: {
            companyApproval: CompanyApproval.Approved,
            ifBusBooked: {
                travellers: travellers?.map((t, i) => ({
                    ...t,
                    Seat: Seats[i],
                })),
                blockSeat: blockBusSeat.data as BlockSeat,
                boardingPointId: BoardingPointId,
                droppingPointId: DroppingPointId,
                resultIndex: ResultIndex,
                searchTokenId: SearchTokenId,
            },
        },
        status: BookingStatus.BOOKED,
        payment: {
            mode: paymentMode,
            status: PaymentStatus.pending,
            cost: +totalAmount,
            fee: +fee,
            total: Math.round(Number(totalAmount) + Number(fee)),
            transactionDetails: {
                date: new Date(),
                id: order?.data.data?.id || '',
                mode: PaymentMode.onlinePay,
                orderId: order?.data.data?.id || '',
            },
        },
        gstDetails: otherDetails?.gstDetails as Bookings['gstDetails'],
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
            Message: "Bus booked successfully",
        }
    });

}