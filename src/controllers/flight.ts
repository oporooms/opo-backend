import { DefaultResponseBody } from "@/types/default";
import { FlightAirportList } from "@/types/Flight/flightlist";
import { Request, Response } from "express";
import FlightAirportListSchema from "@/schemas/Flight/AirportList";
import { FlightSearchProps } from "@/types/Flight/FlightSearchProps";
import { FlightData } from "@/types/Flight/FlightData";
import dayjs from "dayjs";
import bdsdApi from "@/functions/bdsdApi";
import { FareRules } from "@/types/Flight/FareRules";
import { FareConfirmation } from "@/types/Flight/FareConfirmation";
import { FlightSeatMap } from "@/types/Flight/SeatMap";
import { IGetBookingDetailsResponse } from "@/types/Flight/GetBookingDetails";
import { Passengers } from "@/types/Flight/Booking";
import { CancelBookingResponse } from "@/types/Flight/CancelBooking";
import Booking from "@/schemas/Booking";
import { Types } from "mongoose";
import { Bookings, BookingStatus, PaymentMode } from "@/types/Bookings";
import axios from "axios";
import { removeNoSqlInjection } from "@/functions";

const isDevelopment = false

const apiEndPoints = {
    search: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/airservice/rest/search' : 'https://api.bdsd.technology/api/airservice/rest/search',
    fareRule: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/airservice/rest/farerule' : 'https://api.bdsd.technology/api/airservice/rest/farerule',
    fareConfirmation: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/airservice/rest/fareconfirmation' : 'https://api.bdsd.technology/api/airservice/rest/fareconfirmation',
    seatmap: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/airservice/rest/ssr' : 'https://api.bdsd.technology/api/airservice/rest/ssr',
    bookFlight: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/airservice/rest/book' : 'https://api.bdsd.technology/api/airservice/rest/book',
    getBookings: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/airservice/rest/getbookingdetail' : 'https://api.bdsd.technology/api/airservice/rest/getbookingdetail',
    cancelBooking: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/airservice/rest/cancelrequest' : 'https://api.bdsd.technology/api/airservice/rest/cancelrequest',
}

export const getFlightAirportList = async (
    req: Request<{}, {}, {}, {
        city_name: string,
    }>,
    res: Response<DefaultResponseBody<{ list: FlightAirportList[]; count: number }>>
) => {
    const { city_name = removeNoSqlInjection(req.query.city_name) } = req.query
    const query: any = {};

    if (city_name) {
        const trimmed = String(city_name).trim();
        if (trimmed.length < 3) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Minimum 3 letters required for city_name"
                }
            });

            return
        }
        query.city_name = new RegExp(trimmed, 'i');
    }

    let flightList: FlightAirportList[] = [];

    try {
        const q = String(city_name).trim();
        const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const prefixSlice = q.length >= 3 ? esc.slice(0, 3) : esc;
        const fullRegex = { $regex: esc, $options: "i" };
        const prefixRegex = { $regex: "^" + prefixSlice, $options: "i" };

        console.log("Searching for airport with query:", query);

        const orConditions: any[] = [
            // exact city_code match when query is numeric
            ...(/^\d+$/.test(q) ? [{ city_code: q }] : []),

            // full (anywhere) matches
            { city_name: fullRegex },
            { name: fullRegex },
            { code: fullRegex },
            { city_code: fullRegex },
            { country_name: fullRegex },
            { country_code: fullRegex },

            // prefix matches (first 3 letters)
            { city_name: prefixRegex },
            { name: prefixRegex },
            { code: prefixRegex },
            { city_code: prefixRegex },
            { country_name: prefixRegex }
        ];

        // Aggregation: filter, prioritize India, sort and project to expected keys
        flightList = await FlightAirportListSchema.aggregate([
            { $match: { $or: orConditions } },
            { $addFields: { _priority: { $cond: [{ $eq: ["$country_name", "India"] }, 2, 1] } } },
            { $sort: { _priority: -1 } },
            {
                $project: {
                    _id: 0,
                    id: 1,
                    code: 1,
                    name: 1,
                    city_code: 1,
                    city_name: 1,
                    country_name: 1,
                    country_code: 1,
                    airportorder: 1
                }
            }
        ]);

        console.log("Found airports:", flightList);

        const count = await FlightAirportListSchema.countDocuments({ $or: orConditions });

        res.status(200).json({
            data: {
                list: flightList,
                count
            },
            Status: {
                Code: 200,
                Message: "Success"
            }
        })
    }
    catch (err) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        });
    }
};

export const searchFlight = async (
    req: Request<FlightSearchProps>,
    res: Response<DefaultResponseBody<FlightData>>
) => {
    const searchParams = req.query;

    switch (true) {
        case !searchParams.departureCity:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide OriginId",
                }
            });

            return
        case !searchParams.arrivalCity:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide DestinationId",
                }
            });

            return
        case !searchParams.departureDate:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide DateOfJourney",
                }
            });
        case !searchParams.adults:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide AdultCount",
                }
            });
            return
        case Number(searchParams.JourneyType) == 2 && !searchParams.returnDate:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide ReturnDate",
                }
            });
            return
        case searchParams.returnDate && Number(searchParams.JourneyType) == 2 && dayjs(String(searchParams.returnDate)).isBefore(dayjs(String(searchParams.departureDate))):
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Return Date should be greater than Departure Date",
                }
            });
            return
        case Number(searchParams.JourneyType) == 2 && searchParams.departureCity == searchParams.arrivalCity:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Origin and Destination should not be same for Round-trip Journey",
                }
            });
            return
        case Number(searchParams.JourneyType) == 1 && searchParams.departureCity == searchParams.arrivalCity:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Origin and Destination should not be same for One-way Journey",
                }
            });
            return
        case Number(searchParams.adults) < 1:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "AdultCount should be greater than 0",
                }
            });
            return
        case (Number(searchParams.adults) + Number(searchParams.children) + Number(searchParams.infants)) > 9:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Total Passenger Count should not be greater than 9",
                }
            });
            return
        default:
            break;
    }

    const data = {
        "UserIp": "122.161.64.143",
        "Adult": Number(searchParams.adults) || 1,
        "Child": Number(searchParams.children) || 0,
        "Infant": Number(searchParams.infants) || 0,
        "DirectFlight": searchParams.DirectFlight || false,
        "JourneyType": Number(searchParams.JourneyType) || 1,
        "PreferredCarriers": [],
        "CabinClass": Number(searchParams.CabinClass) || 1,
        "AirSegments": [
            {
                "Origin": searchParams.departureCity,
                "Destination": searchParams.arrivalCity,
                "PreferredTime": dayjs(String(searchParams.departureDate)).format('YYYY-MM-DDTHH:mm:ss'),
            },
            ...(Number(searchParams.JourneyType) === 2
                ? [{
                    "Origin": searchParams.arrivalCity,
                    "Destination": searchParams.departureCity,
                    "PreferredTime": dayjs(String(searchParams.returnDate)).format('YYYY-MM-DDTHH:mm:ss'),
                }]
                : [])
        ],
        "Sources": null
    }


    try {
        const response = await bdsdApi<typeof data, FlightData>(apiEndPoints.search, data)
        if (response.Error.ErrorMessage.trim() == '') {
            res.status(200).json({
                data: response,
                Status: {
                    Code: 200,
                    Message: "Success"
                }
            });
            return;
        } else {
            res.status(400).json({
                data: response,
                Status: {
                    Code: 400,
                    Message: response.Error.ErrorMessage
                }
            });
            return;
        }
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        });
        return;
    }
}

export const getFareRules = async (
    req: Request<{
        fareId: string,
        SearchTokenId: string
    }>,
    res: Response<DefaultResponseBody<FareRules>>
) => {

    const searchParams = req.params;

    switch (true) {
        case !searchParams.fareId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide fareId",
                }
            });
        case !searchParams.SearchTokenId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide SearchTokenId",
                }
            });
        default:
            break;
    }

    const data = {
        "UserIp": "122.161.66.42",
        "ResultIndex": searchParams.fareId, // updated to use fareId from searchParams
        "SearchTokenId": searchParams.SearchTokenId // updated to use SearchTokenId from searchParams
    }

    try {
        const response = await bdsdApi<typeof data, FareRules>(apiEndPoints.fareRule, data)

        if (response.Error.ErrorMessage.trim() == '') {
            res.status(200).json({
                data: response,
                Status: {
                    Code: 200,
                    Message: "Success"
                }
            })
        } else {
            res.status(400).json({
                data: response,
                Status: {
                    Code: 400,
                    Message: response.Error.ErrorMessage
                }
            })
        }
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        })
    }
}

export const getConfirmationFare = async (
    req: Request<{
        fareId: string,
        SearchTokenId: string
    }>,
    res: Response<DefaultResponseBody<FareConfirmation>>
) => {

    const searchParams = req.params;

    switch (true) {
        case !searchParams.fareId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide fareId",
                }
            });
            return;
        case !searchParams.SearchTokenId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide SearchTokenId",
                }
            });
            return;
        default:
            break;
    }

    const data = {
        "UserIp": "122.161.66.42",
        "ResultIndex": searchParams.fareId,
        "SearchTokenId": searchParams.SearchTokenId
    };

    try {
        const response = await bdsdApi<typeof data, FareConfirmation>(apiEndPoints.fareConfirmation, data);

        if (response.Error.ErrorMessage.trim() === '') {
            res.status(200).json({
                data: response,
                Status: {
                    Code: 200,
                    Message: "Success"
                }
            });
        } else {
            res.status(400).json({
                data: response,
                Status: {
                    Code: 400,
                    Message: response.Error.ErrorMessage
                }
            });
        }
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        });
    }
};

export const getSeatMap = async (
    req: Request<{
        fareId: string;
        SearchTokenId: string;
    }>,
    res: Response<DefaultResponseBody<FlightSeatMap>>
) => {
    const searchParams = req.params;

    switch (true) {
        case !searchParams.fareId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide fareId",
                }
            });
            return;
        case !searchParams.SearchTokenId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide SearchTokenId",
                }
            });
            return;
        default:
            break;
    }

    const data = {
        "UserIp": "122.161.66.42",
        "ResultIndex": searchParams.fareId,
        "SearchTokenId": searchParams.SearchTokenId
    };

    try {
        const response = await bdsdApi<typeof data, FlightSeatMap>(apiEndPoints.seatmap, data);

        if (response.Error.ErrorMessage.trim() === '') {
            res.status(200).json({
                data: response,
                Status: {
                    Code: 200,
                    Message: "Success"
                }
            });
        } else {
            res.status(400).json({
                data: response,
                Status: {
                    Code: 400,
                    Message: response.Error.ErrorMessage
                }
            });
        }
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        });
    }
};

export const getSeatConfirmationFare = async (
    req: Request<{
        fareId: string;
        fareReturnId?: string;
        SearchTokenId: string;
    }>,
    res: Response<DefaultResponseBody<{
        fareConfirmation: FareConfirmation;
        seatMap: FlightSeatMap;
        fareConfirmationReturn?: FareConfirmation | undefined | null;
        seatMapReturn?: FlightSeatMap | undefined | null;
    } | null>>
) => {
    const searchParams = req.query;

    console.log("Received params:", searchParams);

    switch (true) {
        case !searchParams.fareId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide fareId",
                }
            });
            return;
        case !searchParams.SearchTokenId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide SearchTokenId",
                }
            });
            return;
        default:
            break;
    }

    const data = {
        "UserIp": "122.161.66.42",
        "ResultIndex": searchParams.fareId,
        "SearchTokenId": searchParams.SearchTokenId
    };

    console.log("Request data prepared:", data);

    const dataReturn = {
        "UserIp": "122.161.66.42",
        "ResultIndex": searchParams.fareReturnId,
        "SearchTokenId": searchParams.SearchTokenId
    }

    console.log("Return data prepared:", dataReturn);

    try {
        const fareConfirmationResponse = await bdsdApi<typeof data, FareConfirmation>(apiEndPoints.fareConfirmation, data);

        console.log("Fare Confirmation Response:", fareConfirmationResponse);

        if (fareConfirmationResponse.Error.ErrorMessage.trim() !== '') {
            res.status(400).json({
                data: null,
                Status: {
                    Code: fareConfirmationResponse.Error.ErrorCode || 400,
                    Message: fareConfirmationResponse.Error.ErrorMessage
                }
            });
            return;
        }
        const seatMapResponse = await bdsdApi<typeof data, FlightSeatMap>(apiEndPoints.seatmap, data);

        console.log("Seat Map Response:", seatMapResponse);

        if (seatMapResponse.Error.ErrorMessage.trim() !== '') {
            res.status(400).json({
                data: null,
                Status: {
                    Code: seatMapResponse.Error.ErrorCode || 400,
                    Message: seatMapResponse.Error.ErrorMessage
                }
            });
            return;
        }

        const fareConfirmationReturnResponse = searchParams.fareReturnId ? await bdsdApi<typeof dataReturn, FareConfirmation>(apiEndPoints.fareConfirmation, dataReturn) : null;

        console.log("Fare Confirmation Return Response:", fareConfirmationReturnResponse);

        if (searchParams.fareReturnId && fareConfirmationReturnResponse && fareConfirmationReturnResponse.Error.ErrorMessage.trim() !== '') {
            res.status(400).json({
                data: null,
                Status: {
                    Code: fareConfirmationReturnResponse.Error.ErrorCode || 400,
                    Message: fareConfirmationReturnResponse.Error.ErrorMessage
                }
            });
        }

        const seatMapReturnResponse = searchParams.fareReturnId ? await bdsdApi<typeof dataReturn, FlightSeatMap>(apiEndPoints.seatmap, dataReturn) : null;

        console.log("Seat Map Return Response:", seatMapReturnResponse);

        if (searchParams.fareReturnId && seatMapReturnResponse && seatMapReturnResponse.Error.ErrorMessage.trim() !== '') {
            res.status(400).json({
                data: null,
                Status: {
                    Code: seatMapReturnResponse.Error.ErrorCode || 400,
                    Message: seatMapReturnResponse.Error.ErrorMessage
                }
            });
        }

        res.status(200).json({
            data: {
                fareConfirmation: fareConfirmationResponse,
                seatMap: seatMapResponse,
                fareConfirmationReturn: fareConfirmationReturnResponse,
                seatMapReturn: seatMapReturnResponse
            },
            Status: {
                Code: 200,
                Message: "Success"
            }
        });

    } catch (error) {
        console.log("Error occurred:", error);
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        });
    }
};

export const bookFlight = async (
    req: Request<{}, {}, {
        booking_Id?: string;
        SearchTokenId?: string;
        ResultIndex?: string;
        Passengers?: Passengers[];
    }>,
    res: Response<DefaultResponseBody<IGetBookingDetailsResponse>>
) => {
    const { booking_Id, SearchTokenId, ResultIndex, Passengers } = req.body;

    let booking: Bookings | null = null;

    try {
        if (booking_Id) {
            booking = await Booking.findOne({ _id: new Types.ObjectId(String(booking_Id)) });

            if (!booking) {
                return res.status(404).json({
                    data: null,
                    Status: {
                        Code: 404,
                        Message: "No Data Found",
                    },
                });
            }

            if (booking?.status === BookingStatus.BOOKED) {
                return res.status(200).json({
                    data: booking?.bookingDetails.ifFlightBooked?.bookingResult as IGetBookingDetailsResponse,
                    Status: {
                        Code: 200,
                        Message: "Success",
                    },
                });
            }
        }

        const params = {
            UserIp: "122.161.66.42",
            SearchTokenId:
                (booking?.bookingDetails.ifFlightBooked?.fareConfirmation as FareConfirmation)?.SearchTokenId || SearchTokenId,
            ResultIndex:
                (booking?.bookingDetails.ifFlightBooked?.fareConfirmation as FareConfirmation)?.Result?.ResultIndex || ResultIndex,
            Passengers:
                booking?.bookingDetails.ifFlightBooked?.travellers?.map(({ ...item }) => ({
                    ...item,
                    DateOfBirth: dayjs(item.DateOfBirth).format("YYYY-MM-DD[T]00:00:00"),
                })) ||
                Passengers?.map(({ _id, ...item }) => ({
                    ...item,
                    DateOfBirth: dayjs(item.DateOfBirth).format("YYYY-MM-DD[T]00:00:00"),
                })),
        };

        const response = await bdsdApi<typeof params, IGetBookingDetailsResponse>(apiEndPoints.bookFlight, params);

        if (response.Error.ErrorMessage.trim() === "" && response.Error.ErrorCode === 0) {
            const getBookingDetailsResponse = await axios.get<DefaultResponseBody<IGetBookingDetailsResponse>>(`${process.env.SERVERURL}/api/v1/flight/getBookingDetails?SearchTokenId=${response.SearchTokenId}&BookingId=${response.Result.BookingId}&PNR=${response.Result.PNR}`);

            if (
                getBookingDetailsResponse.data.Status.Message === "" &&
                booking?.payment.mode !== PaymentMode.onlinePay
            ) {
                await Booking.updateOne(
                    { _id: new Types.ObjectId(String(booking_Id)) },
                    {
                        $set: {
                            "bookingDetails.ifFlightBooked.otherDetails": getBookingDetailsResponse,
                            "bookingDetails.status": BookingStatus.BOOKED,
                        },
                    }
                );
            }

            return res.status(200).json({
                data: getBookingDetailsResponse.data.data,
                Status: {
                    Code: 200,
                    Message: "Success",
                },
            });
        }

        return res.status(400).json({
            data: response,
            Status: {
                Code: 400,
                Message: response.Error.ErrorMessage.includes("Agency")
                    ? "Waiting for admin approval."
                    : response.Error.ErrorMessage,
            },
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error",
            },
        });
    }
};

export const getBookingDetails = async (
    req: Request<{ SearchTokenId: string; BookingId: string | number; PNR: string | number }>,
    res: Response<DefaultResponseBody<IGetBookingDetailsResponse>>
) => {

    const { SearchTokenId, BookingId, PNR } = req.params;

    switch (true) {
        case !SearchTokenId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide SearchTokenId",
                }
            });
        case !BookingId:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide BookingId",
                }
            });
        case !PNR:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide PNR",
                }
            });
        default:
            break;
    }

    const params = {
        "UserIp": "223.177.107.156",
        "BookingId": BookingId,
        "PNR": PNR,
        "SearchTokenId": SearchTokenId
    };

    try {
        const response = await bdsdApi<typeof params, IGetBookingDetailsResponse>(apiEndPoints.getBookings, params);

        if (response.Error.ErrorMessage.trim() === '') {
            res.status(200).json({
                data: response,
                Status: {
                    Code: 200,
                    Message: "Success"
                }
            });
        } else {
            res.status(400).json({
                data: response,
                Status: {
                    Code: 400,
                    Message: response.Error.ErrorMessage
                },
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error",
            },
        });
    }
};

export const cancelFlightBooking = async (
    req: Request<{ booking_Id: string }>,
    res: Response<DefaultResponseBody<CancelBookingResponse>>
) => {
    const { booking_Id } = req.params;

    try {
        const booking = await Booking.findOne({ _id: new Types.ObjectId(String(booking_Id)) });

        if (!booking) {
            res.status(404).json({
                data: null,
                Status: {
                    Code: 404,
                    Message: "No Bookings Found",
                },
            });
        }

        if (booking?.status === BookingStatus.CANCELLED) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Booking Already Cancelled",
                },
            });
        }

        const flightData = booking?.bookingDetails.ifFlightBooked?.bookingResult as IGetBookingDetailsResponse;

        const data = {
            UserIp: "49.36.217.215",
            BookingId: flightData?.Result?.BookingId,
            SearchTokenId: flightData?.SearchTokenId,
            RequestType: "PartialCancellation",
            Sectors: flightData?.Result?.Segments?.[0]?.map((item) => ({
                Origin: item.Origin.AirportCode,
                Destination: item.Destination.AirportCode,
            })),
            PaxId: flightData?.Result?.Passenger?.map((item) => item.PaxId),
            Remark: "Cancel Ticket",
        };

        const response = await bdsdApi<typeof data, CancelBookingResponse>(apiEndPoints.cancelBooking, data);

        if (response?.Error?.ErrorMessage.trim() === "") {
            // await updateBookings(booking_Id, {
            //     "bookingDetails.status": BookingStatus.cancelled,
            // });

            res.status(200).json({
                data: response,
                Status: {
                    Code: 200,
                    Message: "Booking Cancelled Successfully",
                },
            });
        } else {
            res.status(400).json({
                data: response,
                Status: {
                    Code: 400,
                    Message: response.Error.ErrorMessage,
                },
            });
        }
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error",
            },
        });
    }
};