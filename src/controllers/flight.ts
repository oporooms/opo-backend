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
import { Bookings, BookingStatus, PaymentMode } from "@/types/oldcode/Booking";
import axios from "axios";

const isDevelopment = process.env.NODE_ENV == 'development'

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
    req: Request<{
        id?: number | string;
        code?: string;
        name?: string;
        country_name?: string;
        country_code?: string;
        city_name?: string;
        city_code?: string;
        airportorder?: number | string | null;
        skip?: number;
    }>,
    res: Response<DefaultResponseBody<{ list: FlightAirportList[]; count: number }>>
) => {
    const { id, code, name, country_name, country_code, city_name, city_code, airportorder, skip } = req.query;
    const query: any = {};

    if (id) query.id = id;
    if (city_name) query.city_name = new RegExp(String(city_name).trim(), 'i');
    if (airportorder) query.airportorder = airportorder;
    if (code) query.code = new RegExp(String(code).trim(), 'i');
    if (name) query.name = new RegExp(String(name).trim(), 'i');
    if (country_name) query.country_name = new RegExp(String(country_name).trim(), 'i');
    if (country_code) query.country_code = new RegExp(String(country_code).trim(), 'i');
    if (city_code) query.city_code = new RegExp(String(city_code).trim(), 'i');

    let flightList: FlightAirportList[] = [];

    try {

        if (query.code) {
            const codeData = await FlightAirportListSchema.find({ code: query.code })
                .skip(Number(skip) * 10)
                .limit(10)
                .lean();
            flightList = flightList.concat(codeData);
        }

        if (query.city_name) {
            const cityData = await FlightAirportListSchema.find({ city_name: query.city_name })
                .skip(Number(skip) * 10)
                .limit(10).lean()
            flightList = cityData;
        }

        if (query.country_name) {
            const countryData = await FlightAirportListSchema.find({ country_name: query.country_name })
                .skip(Number(skip) * 10)
                .limit(10)
                .lean();
            flightList = flightList.concat(countryData);
        }

        if (query.name) {
            const nameData = await FlightAirportListSchema.find({ name: query.name })
                .skip(Number(skip) * 10)
                .limit(10)
                .lean()
            flightList = flightList.concat(nameData);
        }

        if (query.country_code) {
            const countryCodeData = await FlightAirportListSchema.find({ country_code: query.country_code })
                .skip(Number(skip) * 10)
                .limit(10)
                .lean();
            flightList = flightList.concat(countryCodeData);
        }

        if (query.city_code) {
            const cityCodeData = await FlightAirportListSchema.find({ city_code: query.city_code })
                .skip(Number(skip) * 10)
                .limit(10)
                .lean();
            flightList = flightList.concat(cityCodeData);
        }

        // Remove duplicate items based on their unique identifier
        const uniqueFlights = new Map<string, FlightAirportList>();
        flightList.forEach(item => {
            // Assumes that each item has a unique _id property; fallback to JSON stringify if not present.
            const id = item._id ? item._id.toString() : JSON.stringify(item);
            uniqueFlights.set(id, item);
        });

        const uniqueFlightsArray = Array.from(uniqueFlights.values());
        uniqueFlightsArray.sort((a, b) => {
            if (a.country_name === 'India' && b.country_name !== 'India') return -1;
            if (a.country_name !== 'India' && b.country_name === 'India') return 1;
            return 0;
        });

        // Replace the map's values with the sorted array items.
        uniqueFlights.clear();
        uniqueFlightsArray.forEach(item => {
            const id = item._id ? item._id.toString() : JSON.stringify(item);
            uniqueFlights.set(id, item);
        });

        flightList = Array.from(uniqueFlights.values());
        const count = await FlightAirportListSchema.countDocuments(query);


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
    const searchParams = req.params;

    switch (true) {
        case !searchParams.departureCity:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide OriginId",
                }
            });
        case !searchParams.arrivalCity:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide DestinationId",
                }
            });
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
        case searchParams.JourneyType == 2 && !searchParams.returnDate:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide ReturnDate",
                }
            });
        case searchParams.returnDate && Number(searchParams.JourneyType) == 2 && dayjs(searchParams.returnDate).isBefore(dayjs(searchParams.departureDate)):
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Return Date should be greater than Departure Date",
                }
            });
        case Number(searchParams.JourneyType) == 2 && searchParams.departureCity == searchParams.arrivalCity:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Origin and Destination should not be same for Round-trip Journey",
                }
            });
        case Number(searchParams.JourneyType) == 1 && searchParams.departureCity == searchParams.arrivalCity:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Origin and Destination should not be same for One-way Journey",
                }
            });
        case searchParams.adults < 1:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "AdultCount should be greater than 0",
                }
            });
        case (Number(searchParams.adults) + Number(searchParams.children) + Number(searchParams.infants)) > 9:
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Total Passenger Count should not be greater than 9",
                }
            });
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
                "PreferredTime": dayjs(searchParams.departureDate).format('YYYY-MM-DDTHH:mm:ss'),
            },
            ...(Number(searchParams.JourneyType) === 2
                ? [{
                    "Origin": searchParams.arrivalCity,
                    "Destination": searchParams.departureCity,
                    "PreferredTime": dayjs(searchParams.returnDate).format('YYYY-MM-DDTHH:mm:ss'),
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

            if (booking?.bookingDetails.status === BookingStatus.booked) {
                return res.status(200).json({
                    data: booking?.bookingDetails.ifFlightBooked?.otherDetails as IGetBookingDetailsResponse,
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
                (booking?.bookingDetails.ifFlightBooked?.otherDetails as FareConfirmation)?.SearchTokenId || SearchTokenId,
            ResultIndex:
                (booking?.bookingDetails.ifFlightBooked?.otherDetails as FareConfirmation)?.Result?.ResultIndex || ResultIndex,
            Passengers:
                booking?.bookingDetails.ifFlightBooked?.passengers?.map(({ _id, ...item }) => ({
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
                            "bookingDetails.status": BookingStatus.booked,
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

        if (booking?.bookingDetails.status === BookingStatus.cancelled) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Booking Already Cancelled",
                },
            });
        }

        const flightData = booking?.bookingDetails.ifFlightBooked?.otherDetails as IGetBookingDetailsResponse;

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