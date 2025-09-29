import { overallClassification } from "@/functions";
import User from "@/schemas/User";
import { Bookings, BookingStatus, BookingType, CompanyApproval, PaymentMode, PaymentStatus } from "@/types/Bookings";
import { CreateFlightBookingRequest, CreateFlightBookingResponse } from "@/types/Bookings/flight";
import { DefaultResponseBody } from "@/types/default";
import { FareConfirmation } from "@/types/Flight/FareConfirmation";
import { Baggage, FlightSeatMap, Meal, SeatList } from "@/types/Flight/SeatMap";
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
    const { travellers, otherDetails, userId, createdBy, paymentMode, price, seat, seatReturn, meal, mealReturn, baggage, baggageReturn, fareId, fareReturnId, SearchTokenId, JourneyType } = req.body;

    type FareSeatResponse = DefaultResponseBody<{
        fareConfirmation: FareConfirmation;
        seatMap: FlightSeatMap;
        fareConfirmationReturn?: FareConfirmation | null;
        seatMapReturn?: FlightSeatMap | null;
    } | null>;

    let fareDetails: FareSeatResponse;
    try {
        ({ data: fareDetails } = await axios.get<FareSeatResponse>(
            `${process.env.SERVER_URL}/api/flight/getSeatConfirmationFare?fareId=${fareId}&fareReturnId=${fareReturnId || ""}&SearchTokenId=${SearchTokenId}`
        ));
    } catch (error) {
        res.status(502).json({ data: null, Status: { Code: 502, Message: "Failed to fetch fare details" } });
        return;
    }

    const { data: fareData, Status: fareStatus } = fareDetails;
    const fareConfirmation = fareData?.fareConfirmation;

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

    const user = await User.findOne({ _id: new Types.ObjectId(userId) });
    const createdById = await User.findOne({ _id: new Types.ObjectId(createdBy) });

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
               travellers: travellers,
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
        createdBy: new Types.ObjectId(createdById?._id.toString()),
        createdAt: new Date(),
        updatedAt: new Date()
    }

    // const objReturn: Bookings['bookingDetails']['ifFlightBooked'] | undefined = isRoundTrip && fareConfirmationReturn && {
    //     userId: [new Types.ObjectId(String(req.user?.userId))],
    //     bookingType: BookingType.Flight,
    //     bookingDate: new Date(),
    //     bookingDetails: {
    //         companyApproval: CompanyApproval.Approved,
    //         ifFlightBooked: {
    //             travellers: travellers,
    //             selectedSeats: selectedSeatReturn,
    //             selectedBaggage: selectedBaggageReturn,
    //             selectedMeal: selectedMealReturn,
    //             fareConfirmation: fareConfirmationReturn,
    //         },
    //     },
    //     status: BookingStatus.BOOKED,
    //     payment: {
    //         mode: paymentMode,
    //         status: PaymentStatus.pending,
    //         cost: +totalAmount,
    //         fee: 0,
    //         total: Math.round(Number(totalAmount)),
    //         transactionDetails: {
    //             date: new Date(),
    //             id: order?.data.data?.id || '',
    //             mode: PaymentMode.onlinePay,
    //             orderId: order?.data.data?.id || '',
    //         },
    //     },
    //     gstDetails: otherDetails?.gstDetails as Bookings['gstDetails'],
    //     createdBy: new Types.ObjectId(createdById?._id.toString()),
    //     createdAt: new Date(),
    //     updatedAt: new Date()
    // }
        

}