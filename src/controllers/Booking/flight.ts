import { overallClassification } from "@/functions";
import { CreateFlightBookingRequest, CreateFlightBookingResponse } from "@/types/Bookings/flight";
import { DefaultResponseBody } from "@/types/default";
import { FareConfirmation } from "@/types/Flight/FareConfirmation";
import { Baggage, FlightSeatMap, Meal, SeatList } from "@/types/Flight/SeatMap";
import axios from "axios";
import dotenv from "dotenv";
import { Request, Response } from "express";

if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env" });
} else {
    dotenv.config({ path: ".env.local" });
}

export const createFlightBooking = async (
    req: Request<any, any, CreateFlightBookingRequest>,
    res: Response<DefaultResponseBody<CreateFlightBookingResponse>>
) => {
    const { travellers, userId, createdBy, paymentMode, price, seat, seatReturn, meal, mealReturn, baggage, baggageReturn, fareId, fareReturnId, SearchTokenId, JourneyType } = req.body;

    const fareDetails = await axios.get<DefaultResponseBody<{
        fareConfirmation: FareConfirmation;
        seatMap: FlightSeatMap;
        fareConfirmationReturn?: FareConfirmation | undefined | null;
        seatMapReturn?: FlightSeatMap | undefined | null;
    } | null>>(`${process.env.SERVER_URL}/api//flight/getSeatConfirmationFare?fareId=${fareId}&fareReturnId=${fareReturnId || ''}&SearchTokenId=${SearchTokenId}`).then(res => res.data)

    const fareConfirmation = fareDetails.data?.fareConfirmation;

    if (!fareConfirmation || !fareConfirmation?.Result || !fareConfirmation?.Result?.Segments || fareConfirmation?.Result?.Segments.length === 0) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Invalid fare details"
            },
        });
        return;
    }

    const fareConfirmationReturn = fareDetails.data?.fareConfirmationReturn;

    const seatMaps = fareDetails.data?.seatMap as FlightSeatMap;

    if(!seatMaps || !seatMaps?.Result){
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Invalid seat map details"
            },
        });
        return;
    }

    const seatMapReturn = fareDetails.data?.seatMapReturn as FlightSeatMap | undefined | null;

    const flattenedSeats = seatMaps.Result?.Seats?.flatMap((level1: any[]) =>
        level1.flatMap(seatGroup => {
            const ul = seatGroup.ul;
            return Object.values(ul).flat(); // flatten all seat arrays
        })
    );

    const flattenedSeatsReturn: SeatList[] | undefined = (Number(JourneyType) === 2 && seatMapReturn)
        ? (seatMapReturn?.Result?.Seats?.flatMap((level1: any[]) =>
            level1.flatMap(seatGroup => {
                const ul = seatGroup.ul;
                return Object.values(ul).flat(); // flatten all seat arrays
            })
        ) as SeatList[] | undefined)
        : undefined;

    const flatBaggage = seatMaps.Result?.Baggage?.flat();
    const flatBaggageReturn = Number(JourneyType) == 2 && seatMapReturn && seatMapReturn.Result?.Baggage?.flat();
    const flatMeal = seatMaps.Result?.Meal?.flat();
    const flatMealReturn = Number(JourneyType) == 2 && seatMapReturn && seatMapReturn.Result?.Meal?.flat();

    const selectedSeat: SeatList[] = (flattenedSeats as SeatList[] | undefined)?.filter(i => seat.find(j => j.Key == i.Key)) || []

    const selectedBaggage: Baggage[] = flatBaggage?.filter((i: Baggage) => baggage.find(j => j.Key == i.Key))

    const selectedMeal: Meal[] = flatMeal?.filter((i: Meal) => meal.find(j => j.Key == i.Key)).map((k: any, mealIndex: string | number) => ({ ...k, Quantity: Number(meal[Number(mealIndex)].Quantity) }))

    const selectedSeatReturn: SeatList[] | undefined = flattenedSeatsReturn?.filter((i: SeatList) => !!seatReturn?.some(j => j.Key == i.Key));
    console.log('selectedSeatReturn', selectedSeatReturn)

    const selectedBaggageReturn: Baggage[] | undefined | false | null = flatBaggageReturn && flatBaggageReturn?.filter((i: Baggage) => baggageReturn.find(j => j.Key == i.Key))

    const selectedMealReturn: Meal[] | undefined | false | null = flatMealReturn && flatMealReturn?.filter((i: Meal) => mealReturn.find(j => j.Key == i.Key)).map((k: any, mealIndex: string | number) => ({ ...k, Quantity: Number(mealReturn[Number(mealIndex)]?.Quantity) || 1 }))

    const classification = overallClassification(fareConfirmation?.Result?.Segments?.[0] ?? [])

    const classificationReturn = Number(JourneyType) == 2 && fareConfirmationReturn
        ? overallClassification(fareConfirmationReturn?.Result?.Segments?.[0] ?? [])
        : undefined

    const seatPrice = selectedSeat?.reduce((acc, seat) => {
        return acc + (seat?.Price || 0);
    }, 0) || 0;
    const mealPrice = selectedMeal?.reduce((acc, meal) => {
        return acc + ((meal?.Price * meal.Quantity) || 0);
    }, 0) || 0;
    const baggagePrice = selectedBaggage?.reduce((acc, bag) => {
        return acc + (bag?.Price || 0);
    }, 0) || 0;

    const seatPriceReturn = selectedSeatReturn ? selectedSeatReturn?.reduce((acc, seat) => {
        return acc + (seat?.Price || 0);
    }, 0) : 0;
    const mealPriceReturn = selectedMealReturn ? selectedMealReturn?.reduce((acc, meal) => {
        return acc + ((meal?.Price * meal.Quantity) || 0);
    }, 0) : 0;
    const baggagePriceReturn = selectedBaggageReturn ? selectedBaggageReturn?.reduce((acc, bag) => {
        return acc + (bag?.Price || 0);
    }, 0) : 0;

    const totalAmount = Number(fareConfirmation?.Result?.Fare?.PublishedPrice + seatPrice + mealPrice + baggagePrice).toFixed(2);

    const totalAmountReturn = (Number(JourneyType) == 2 && fareConfirmationReturn && classificationReturn) ? Number(fareConfirmationReturn?.Result?.Fare?.PublishedPrice + seatPriceReturn + mealPriceReturn + baggagePriceReturn).toFixed(2) : 0;

}