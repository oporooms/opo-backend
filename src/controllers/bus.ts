import BusList from "@/schemas/Bus/BusList";
import { BusListType } from "@/types/Bus/BusList";
import { DefaultResponseBody } from "@/types/default";
import { Request, Response } from "express";
import dayjs from "dayjs";
import { BusResponse } from "@/types/Bus/Bus";
import bdsdApi from "@/functions/bdsdApi";
import { SeatResponse } from "@/types/Bus/SeatMap";
import { BoardingPointResponse } from "@/types/Bus/BoardingPoints";
import { BlockSeat } from "@/types/Bus/BlockSeat";
import { IGetBookingDetails } from "@/types/Bus/GetBookingDetails";
import { BookSeatResponse } from "@/types/Bus/BookSeat";
import { CancelBookingResponse } from "@/types/Bus/CancelBooking";
import Booking from "@/schemas/Booking";
import { Types } from "mongoose";
import { Bookings, BookingStatus, PaymentMode } from "@/types/Bookings";
import axios from "axios";
import { removeNoSqlInjection } from "@/functions";
import { Passenger } from "@/types/Bus/Passenger";
import { AxiosError } from "axios";

const isDevelopment = false

const apiEndPoints = {
    search: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/busservice/rest/search' : 'https://api.bdsd.technology/api/busservice/rest/search',
    seatLayout: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/busservice/rest/seatlayout' : 'https://api.bdsd.technology/api/busservice/rest/seatlayout',
    boardingPoints: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/busservice/rest/boardingpoint' : 'https://api.bdsd.technology/api/busservice/rest/boardingpoint',
    blockseat: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/busservice/rest/blockseat' : 'https://api.bdsd.technology/api/busservice/rest/blockseat',
    bookBus: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/busservice/rest/book' : 'https://api.bdsd.technology/api/busservice/rest/book',
    getBookings: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/busservice/rest/getbookingdetail' : 'https://api.bdsd.technology/api/busservice/rest/getbookingdetails',
    cancelBooking: isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/busservice/rest/cancelrequest' : 'https://api.bdsd.technology/api/busservice/rest/cancelrequest',
}

export const getBusList = async (
    req: Request<any, any, { city_name?: string; skip?: number }>,
    res: Response<DefaultResponseBody<{ list: BusListType[]; count: number }>>
) => {
    const { city_name = removeNoSqlInjection(req.query.city_name as string), skip = 0 } = req.query
    const query: any = {};

    if (city_name) query.city_name = new RegExp(String(city_name).trim(), 'i');

    console.log({ city_name });

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

    try {
        const q = String(city_name).trim();
        const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const prefixSlice = q.length >= 3 ? esc.slice(0, 3) : esc;
        const fullRegex = { $regex: esc, $options: "i" };
        const prefixRegex = { $regex: "^" + prefixSlice, $options: "i" };


        const orConditions: any[] = [
            // full (anywhere) matches
            { city_name: fullRegex },

            // prefix matches (first 3 letters)
            { city_name: prefixRegex },
        ];

        const busList = await BusList.aggregate([
            { $match: { $or: orConditions } },
            { $skip: Number(skip) * 10 },
            { $limit: 10 },
        ]);

        console.log({ busList });

        const count = await BusList.countDocuments(query);

        res.status(200).json({
            data: {
                list: busList,
                count: count
            },
            Status: {
                Code: 200,
                Message: "Success"
            }
        })
    } catch (error) {
        console.log("Error in getBusList:", error);
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        });
    }
}

export const searchBuses = async (
    req: Request<{}, {}, {}, { OriginId?: string; DestinationId?: string; DateOfJourney?: string }>,
    res: Response<DefaultResponseBody<BusResponse>>
) => {
    const { OriginId, DestinationId, DateOfJourney } = req.query;
    console.log({ OriginId, DestinationId, DateOfJourney });

    if (!OriginId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide OriginId"
            }
        });
    }

    if (!DestinationId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide DestinationId"
            }
        });
    }

    if (!DateOfJourney) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide DateOfJourney"
            }
        });
    }

    const params = {
        UserIp: "103.209.223.52",
        OriginId,
        DestinationId,
        DateOfJourney: dayjs(String(DateOfJourney)).format("YYYY-MM-DD"),
    };

    try {
        const response = await bdsdApi<typeof params, BusResponse>(apiEndPoints.search, params);
        console.log({ response });

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
                data: null,
                Status: {
                    Code: response.Error.ErrorCode || 400,
                    Message: response.Error.ErrorMessage || "Bad Request"
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
    req: Request<{}, {}, {}, { SearchTokenId?: string; ResultIndex?: string }>,
    res: Response<DefaultResponseBody<SeatResponse>>
) => {
    const { SearchTokenId, ResultIndex } = req.query;

    if (!SearchTokenId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide SearchTokenId"
            }
        });
    }

    if (!ResultIndex) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide ResultIndex"
            }
        });
    }

    const params = {
        UserIp: "103.209.223.52",
        SearchTokenId,
        ResultIndex,
    };

    try {
        const response = await bdsdApi<typeof params, SeatResponse>(apiEndPoints.seatLayout, params);

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
                data: null,
                Status: {
                    Code: 400,
                    Message: response.Error.ErrorMessage
                }
            });
        }
    } catch (error) {
        console.error("Error fetching seat map:", error);
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        });
    }
};

export const getBoardingPoints = async (
    req: Request<{}, {}, {}, { SearchTokenId?: string; ResultIndex?: string }>,
    res: Response<DefaultResponseBody<BoardingPointResponse>>
) => {
    const { SearchTokenId, ResultIndex } = req.query;

    if (!SearchTokenId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide SearchTokenId"
            }
        });
    }

    if (!ResultIndex) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide ResultIndex"
            }
        });
    }

    const params = {
        UserIp: "103.209.223.52",
        SearchTokenId,
        ResultIndex,
    };

    try {
        const response = await bdsdApi<typeof params, BoardingPointResponse>(apiEndPoints.boardingPoints, params);

        console.log({ boardingResponse: response });

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
                data: null,
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

export const blockBusSeat = async (
    req: Request<{}, {}, {
        SearchTokenId?: string;
        ResultIndex?: string;
        BoardingPointId?: number;
        DroppingPointId?: number;
        Passenger?: Passenger[];
    }>, 
    res: Response<DefaultResponseBody<BlockSeat>>
) => {
    const { SearchTokenId, ResultIndex, BoardingPointId, DroppingPointId, Passenger } = req.body;

    console.log("🚀 ~ file: bus.ts:34 ~ createBusBooking ~ req.body:", req.body);

    if (!SearchTokenId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide SearchTokenId"
            }
        });
    }

    if (!ResultIndex) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide ResultIndex"
            }
        });
    }

    if (!BoardingPointId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide BoardingPointId"
            }
        });
    }

    if (!DroppingPointId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide DroppingPointId"
            }
        });
    }

    if (!Passenger || Passenger.length === 0) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide Passenger"
            }
        });
    }

    const params = {
        UserIp: "103.209.223.52",
        SearchTokenId,
        ResultIndex,
        BoardingPointId: Number(BoardingPointId),
        DroppingPointId: Number(DroppingPointId),
        Passenger
    };

    console.log("🚀 ~ file: bus.ts:79 ~ createBusBooking ~ params:", params);

    try {
        const response = await bdsdApi<typeof params, BlockSeat>(apiEndPoints.blockseat, params);

        if (response.Error.ErrorMessage.trim() === '') {
            res.status(200).json({
                data: response,
                Status: {
                    Code: 200,
                    Message: "Success"
                }
            });
        } else {
            console.error("Error blocking bus seat:", response.Error.ErrorMessage);
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: response.Error.ErrorMessage
                }
            });
        }
    } catch (error) {
        if(error instanceof AxiosError){
            console.error("Axios error in block seat:", error.response?.data?.Status);
        }
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        });
    }
};

export const bookBusSeat = async (
    req: Request<{}, {}, {
        booking_Id?: string;
    }>,
    res: Response<DefaultResponseBody<IGetBookingDetails | BookSeatResponse>>
) => {
    const { booking_Id } = req.body;

    let booking: Bookings | null = null;

    if (booking_Id) {
        try {
            booking = await Booking.findOne({ _id: new Types.ObjectId(booking_Id) });

            if (!booking) {
                res.status(404).json({
                    data: null,
                    Status: {
                        Code: 404,
                        Message: "Booking not found"
                    }
                });

                return
            }

            if (booking.status === BookingStatus.BOOKED) {
                res.status(200).json({
                    data: booking.bookingDetails.ifBusBooked?.bookingResult,
                    Status: {
                        Code: 200,
                        Message: "Success"
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

    const params = {
        UserIp: "103.209.223.52",
        SearchTokenId: booking?.bookingDetails.ifBusBooked?.blockSeat?.SearchTokenId,
        ResultIndex: booking?.bookingDetails.ifBusBooked?.resultIndex,
        BoardingPointId: booking?.bookingDetails.ifBusBooked?.boardingPointId,
        DroppingPointId: booking?.bookingDetails.ifBusBooked?.droppingPointId,
        Passenger: booking?.bookingDetails.ifBusBooked?.blockSeat?.Result?.Passenger,
    };

    try {
        const response = await bdsdApi<typeof params, BookSeatResponse>(apiEndPoints.bookBus, params);

        if (response.Error.ErrorMessage.trim() === '' && response.Error.ErrorCode === 0) {

            const getBookingDetailsResponse = await axios.get<DefaultResponseBody<IGetBookingDetails>>(`${process.env.SERVERURL}/api/v1/bus/getBookingDetails?SearchTokenId=${response.SearchTokenId}&BookingId=${response.Result.BookingID}`);


            if (getBookingDetailsResponse.data.Status.Message.trim() === '' && booking?.payment.mode !== PaymentMode.onlinePay) {
                await Booking.updateOne(
                    { _id: new Types.ObjectId(booking_Id) },
                    {
                        $set: {
                            'bookingDetails.ifBusBooked.otherDetails': getBookingDetailsResponse.data.data,
                            'status': BookingStatus.BOOKED,
                        }
                    }
                );
            }

            res.status(200).json({
                data: getBookingDetailsResponse.data.data,
                Status: {
                    Code: 200,
                    Message: "Success"
                }
            });
        }

        res.status(400).json({
            data: {
                ...response,
                Error: {
                    ErrorCode: response.Error.ErrorCode,
                    ErrorMessage: response.Error.ErrorMessage?.includes('Agency') ? `Waiting for admin approval.` : `${response.Error.ErrorMessage}`,
                }
            },
            Status: {
                Code: 400,
                Message: "Bad Request"
            }
        });
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

export const getBookingDetails = async (
    req: Request<{ SearchTokenId?: string; BookingId?: string | number }, {}, {}, {}>,
    res: Response<DefaultResponseBody<IGetBookingDetails>>
) => {
    const { SearchTokenId, BookingId } = req.params;

    if (!SearchTokenId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Bad Request"
            }
        });
    }

    if (!BookingId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Bad Request"
            }
        });
    }

    const params = {
        UserIp: "223.177.107.156",
        SearchTokenId,
        BookingId,
    };

    try {
        const response = await bdsdApi<typeof params, IGetBookingDetails>(apiEndPoints.getBookings, params);

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

export const cancelBooking = async (
    req: Request<{}, {}, { booking_Id: string }>,
    res: Response<DefaultResponseBody<CancelBookingResponse>>
) => {
    const { booking_Id } = req.body;

    if (!booking_Id) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Please provide booking_Id"
            }
        });
    }

    try {
        const booking = await Booking.findOne({ _id: new Types.ObjectId(booking_Id) }) as Bookings;

        if (!booking) {
            res.status(404).json({
                data: null,
                Status: {
                    Code: 404,
                    Message: "Booking not found"
                }
            });
        }

        const params = {
            UserIp: "223.177.107.156",
            SearchTokenId: booking.bookingDetails.ifBusBooked?.bookingResult?.SearchTokenId,
            BookingId: booking.bookingDetails.ifBusBooked?.bookingResult?.Result?.BookingId,
            SeatId: booking.bookingDetails.ifBusBooked?.blockSeat?.Result?.Passenger?.map((traveller) => traveller.Seat?.SeatName).join(','),
            Remarks: "Cancel Bus Ticket"
        };

        console.log({ params });

        const response = await bdsdApi<typeof params, CancelBookingResponse>(apiEndPoints.cancelBooking, params);

        console.log(response);

        if (response?.SendChangeRequestResult?.Error?.ErrorMessage.trim() === '') {
            // await updateBookings(booking_Id, {
            //     'bookingDetails.status': BookingStatus.cancelled,
            //     'bookingDetails.ifBusBooked.cancelDetails': response
            // });

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
                    Message: response.SendChangeRequestResult?.Error?.ErrorMessage || "Bad Request"
                }
            });
        }
    } catch (error) {
        console.error("Error canceling booking:", error);
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: "Internal Server Error"
            }
        });
    }
};