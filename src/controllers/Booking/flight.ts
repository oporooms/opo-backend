import { formatIndianPhoneNumber, overallClassification } from "@/functions";
import Booking from "@/schemas/Booking";
import User from "@/schemas/User";
import { Bookings, BookingStatus, BookingType, CompanyApproval, PaymentMode, PaymentStatus } from "@/types/Bookings";
import { CreateFlightBookingRequest, CreateFlightBookingResponse } from "@/types/Bookings/flight";
import { DefaultResponseBody } from "@/types/default";
import { FareConfirmation } from "@/types/Flight/FareConfirmation";
import { Baggage, FlightSeatMap, Meal, SeatList } from "@/types/Flight/SeatMap";
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

export const createFlightBooking = async (
    req: Request<any, any, CreateFlightBookingRequest>,
    res: Response<DefaultResponseBody<CreateFlightBookingResponse>>
) => {
    const { travellers, otherDetails, paymentMode, price, seat, seatReturn, meal, mealReturn, baggage, baggageReturn, fareId, fareReturnId, SearchTokenId, JourneyType } = req.body;

    type FareSeatResponse = DefaultResponseBody<{
        fareConfirmation: FareConfirmation;
        seatMap: FlightSeatMap;
        fareConfirmationReturn?: FareConfirmation | null;
        seatMapReturn?: FlightSeatMap | null;
    } | null>;

    let fareDetails = await axios.get<FareSeatResponse>(
        `${process.env.SERVER_URL}/api/v1/flight/getSeatConfirmationFare?fareId=${fareId}&fareReturnId=${fareReturnId}&SearchTokenId=${SearchTokenId}`
    ).then(response => response.data)
        .catch(error => {
            res.status(500).json({ data: null, Status: { Code: 500, Message: "Failed to fetch fare and seat details" } });
            return null;
        });

    if (!fareDetails || fareDetails.Status.Code !== 200) {
        res.status(400).json({ data: null, Status: { Code: 400, Message: "Failed to fetch fare and seat details" } });
        return;
    }

    const { data: fareData, Status: fareStatus } = fareDetails;

    const fareConfirmation = fareDetails?.data?.fareConfirmation;

    if (!fareData || fareStatus?.Code !== 200 || !fareConfirmation?.Result?.Segments?.length) {
        res.status(400).json({ data: null, Status: { Code: 400, Message: "Invalid fare details" } });
        return;
    }

    const seatMap = fareData.seatMap;
    if (!seatMap?.Result) {
        res.status(400).json({ data: null, Status: { Code: 400, Message: "Invalid seat map details" } });
        return;
    }

    const isRoundTrip = Number(JourneyType) === 2;
    const fareConfirmationReturn = fareData.fareConfirmationReturn;
    const seatMapReturn = fareData.seatMapReturn ?? null;

    const flattenSeats = (map?: FlightSeatMap | null): SeatList[] => map?.Result?.Seats?.flatMap((deck: any[]) => deck.flatMap(({ ul }: { ul: Record<string, SeatList[]> }) => Object.values(ul ?? {}).flat())) ?? [];
    const flattenBaggage = (map?: FlightSeatMap | null): Baggage[] => map?.Result?.Baggage?.flat() ?? [];
    const flattenMeals = (map?: FlightSeatMap | null): Meal[] => map?.Result?.Meal?.flat() ?? [];

    const selectByKeys = <T extends { Key: string }>(items: T[] | undefined, keys: Set<string>) => (items ?? []).filter(item => keys.has(item.Key));
    const withQuantities = (items: Meal[], quantities: Map<string, number>) => items.map(item => ({ ...item, Quantity: quantities.get(item.Key) ?? item.Quantity ?? 1 }));
    const sumPrice = <T>(items: T[] | undefined, price: (item: T) => number) => (items ?? []).reduce((total, item) => total + price(item), 0);

    const seatKeys = new Set((seat ?? []).map(({ Key }) => Key));
    const baggageKeys = new Set((baggage ?? []).map(({ Key }) => Key));
    const mealInput = meal ?? [];
    const mealQuantities = new Map(mealInput.map(({ Key, Quantity }) => [Key, Number(Quantity) || 1]));
    const mealKeys = new Set(mealInput.map(({ Key }) => Key));

    const seatReturnKeys = new Set((seatReturn ?? []).map(({ Key }) => Key));
    const baggageReturnKeys = new Set((baggageReturn ?? []).map(({ Key }) => Key));
    const mealReturnInput = mealReturn ?? [];
    const mealReturnQuantities = new Map(mealReturnInput.map(({ Key, Quantity }) => [Key, Number(Quantity) || 1]));
    const mealReturnKeys = new Set(mealReturnInput.map(({ Key }) => Key));

    const selectedSeat = selectByKeys(flattenSeats(seatMap), seatKeys);
    const selectedBaggage = selectByKeys(flattenBaggage(seatMap), baggageKeys);
    const selectedMeal = withQuantities(selectByKeys(flattenMeals(seatMap), mealKeys), mealQuantities);

    const selectedSeatReturn = isRoundTrip ? selectByKeys(flattenSeats(seatMapReturn), seatReturnKeys) : undefined;
    const selectedBaggageReturn = isRoundTrip ? selectByKeys(flattenBaggage(seatMapReturn), baggageReturnKeys) : undefined;
    const selectedMealReturn = isRoundTrip ? withQuantities(selectByKeys(flattenMeals(seatMapReturn), mealReturnKeys), mealReturnQuantities) : undefined;

    const seatPrice = sumPrice(selectedSeat, item => item.Price ?? 0);
    const mealPrice = sumPrice(selectedMeal, item => (item.Price ?? 0) * (item.Quantity ?? 1));
    const baggagePrice = sumPrice(selectedBaggage, item => item.Price ?? 0);

    const seatPriceReturn = sumPrice(selectedSeatReturn, item => item.Price ?? 0);
    const mealPriceReturn = sumPrice(selectedMealReturn, item => (item.Price ?? 0) * (item.Quantity ?? 1));
    const baggagePriceReturn = sumPrice(selectedBaggageReturn, item => item.Price ?? 0);

    const totalAmount = (Number(fareConfirmation.Result?.Fare?.PublishedPrice ?? 0) + seatPrice + mealPrice + baggagePrice).toFixed(2);
    const totalAmountReturn = isRoundTrip && fareConfirmationReturn ? (Number(fareConfirmationReturn.Result?.Fare?.PublishedPrice ?? 0) + seatPriceReturn + mealPriceReturn + baggagePriceReturn).toFixed(2) : 0;

    const classification = overallClassification(fareConfirmation.Result?.Segments?.[0] ?? []);
    const classificationReturn = isRoundTrip && fareConfirmationReturn ? overallClassification(fareConfirmationReturn.Result?.Segments?.[0] ?? []) : undefined;

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
        bookingType: BookingType.Flight,
        bookingDate: new Date(),
        bookingDetails: {
            companyApproval: CompanyApproval.Approved,
            ifFlightBooked: {
                travellers: travellers?.map((traveller, travellerIndex) => ({
                    ...traveller,
                    AddressLine1: otherDetails?.address1,
                    AddressLine2: otherDetails?.address2,
                    City: otherDetails?.city,
                    CountryCode: 'IN',
                    CountryName: 'India',
                    Email: otherDetails?.email,
                    Nationality: 'IN',
                    ContactNo: formatIndianPhoneNumber(otherDetails?.phone).cleanedPhone as string,
                    Baggage: selectedBaggage,
                    Meal: selectedMeal,
                    Seat: selectedSeat.filter((_, seatIndex) => seatIndex === travellerIndex),
                })),
                selectedSeats: selectedSeat,
                selectedBaggage: selectedBaggage,
                selectedMeal: selectedMeal,
                fareConfirmation: fareConfirmation,
            },
        },
        status: BookingStatus.BOOKED,
        payment: {
            mode: paymentMode,
            status: PaymentStatus.pending,
            cost: +totalAmount,
            fee: 0,
            total: Math.round(Number(totalAmount)),
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

    const objReturn: Bookings | null = (isRoundTrip && fareConfirmationReturn) ? {
        userId: [new Types.ObjectId(String(req.user?.userId))],
        bookingType: BookingType.Flight,
        bookingDate: new Date(),
        bookingDetails: {
            companyApproval: CompanyApproval.Approved,
            ifFlightBooked: {
                travellers: travellers,
                selectedSeats: selectedSeatReturn as SeatList[],
                selectedBaggage: selectedBaggageReturn as Baggage[],
                selectedMeal: selectedMealReturn as Meal[],
                fareConfirmation: fareConfirmationReturn,
            },
        },
        status: BookingStatus.BOOKED,
        payment: {
            mode: paymentMode,
            status: PaymentStatus.pending,
            cost: +totalAmount,
            fee: 0,
            total: Math.round(Number(totalAmount)),
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
    } : null

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

    if (paymentMode === PaymentMode.payByCompany && Number(JourneyType) === 2 && objReturn) {
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
            Message: "Flight booked successfully",
        }
    });

}