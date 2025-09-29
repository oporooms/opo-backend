import { DefaultResponseBody } from "@/types/default";
import { Request, Response } from "express";
import dayjs from "dayjs";
import bdsdApi from "@/functions/bdsdApi";
import { SearchProps } from "@/types/BdsdHotel/SearchProps";
import { HotelListResponse } from "@/types/BdsdHotel/HotelList";
import { HotelInfoResponse } from "@/types/BdsdHotel/HotelInfo";
import { HotelRoomResponse } from "@/types/BdsdHotel/HotelRoom";

const isDevelopment = false

const prefixApi = isDevelopment ? 'https://www.stagingapi.bdsd.technology/api/hotelservice/rest' : 'https://api.bdsd.technology/api/hotelservice/rest'

const apiEndPoints = {
    search: `${prefixApi}/search`,
    gethotelinfo: `${prefixApi}/gethotelinfo`,
    getroominfo: `${prefixApi}/getroominfo`,
    blockroom: `${prefixApi}/blockroom`,
    book: `${prefixApi}/book`,
    generatevoucher: `${prefixApi}/generatevoucher`,
    getbookingdetail: `${prefixApi}/getbookingdetail`,
    cancelrequest: `${prefixApi}/cancelrequest`,
    refundrequest: `${prefixApi}/refundrequest`,
    updatebookingdetail: `${prefixApi}/updatebookingdetail`,
}


export const searchHotel = async (
    req: Request<any, any, SearchProps>,
    res: Response<DefaultResponseBody<HotelListResponse>>
) => {

    const {
        CheckInDate,
        CheckOutDate,
        DestinationCityId,
        NoOfRooms,
        RoomGuests,
        NoOfNights,
        ResultCount,
        GuestNationality="IN",
        CountryCode="IN",
        CityName,
        MaxRating="5",
        MinRating="1",
    } = req.body

    let providedNights = req.body.NoOfNights

    // if NoOfNights not provided or invalid, compute it from CheckInDate and CheckOutDate
    // if ((providedNights === undefined || providedNights === null || isNaN(Number(providedNights)) || Number(providedNights) <= 0) && CheckInDate && CheckOutDate) {
    //     const ciEarly = dayjs(CheckInDate)
    //     const coEarly = dayjs(CheckOutDate)
    //     if (ciEarly.isValid() && coEarly.isValid() && coEarly.isAfter(ciEarly)) {
    //         providedNights = coEarly.diff(ciEarly, 'day')
    //     }
    // }

    // // required fields
    // if (!CheckInDate || !CheckOutDate) {
    //     res.status(400).json({
    //         data: null,
    //         Status: { Code: 400, Message: 'CheckInDate and CheckOutDate are required' }
    //     })

    //     return
    // }

    // const ci = dayjs(CheckInDate)
    // const co = dayjs(CheckOutDate)

    // if (!ci.isValid() || !co.isValid()) {
    //     res.status(400).json({
    //         data: null,
    //         Status: { Code: 400, Message: 'CheckInDate or CheckOutDate is not a valid date' }
    //     })

    //     return
    // }

    // if (!co.isAfter(ci)) {
    //     res.status(400).json({
    //         data: null,
    //         Status: { Code: 400, Message: 'CheckOutDate must be after CheckInDate' }
    //     })

    //     return
    // }

    // if (DestinationCityId === undefined || DestinationCityId === null || isNaN(Number(DestinationCityId))) {
    //     res.status(400).json({
    //         data: null,
    //         Status: { Code: 400, Message: 'DestinationCityId is required and must be a number' }
    //     })
    //     return
    // }

    // // sanitize / validate room counts
    // const rooms = Number(NoOfRooms) || 1
    // if (rooms < 1 || !Number.isFinite(rooms)) {
    //     res.status(400).json({
    //         data: null,
    //         Status: { Code: 400, Message: 'NoOfRooms must be a positive integer' }
    //     })
    //     return
    // }

    // // compute nights if not provided or invalid
    // const computedNights = co.diff(ci, 'day')
    // if (providedNights === undefined || providedNights === null || isNaN(Number(providedNights)) || Number(providedNights) <= 0) {
    //     providedNights = computedNights
    // } else if (Number(providedNights) !== computedNights) {
    //     // normalize to computed nights to avoid inconsistent requests
    //     providedNights = computedNights
    // }

    // // validate RoomGuests array if present
    // if (RoomGuests !== undefined) {
    //     if (!Array.isArray(RoomGuests)) {
    //         res.status(400).json({ data: null, Status: { Code: 400, Message: 'RoomGuests must be an array when provided' } })
    //         return
    //     }
    //     if (RoomGuests.length !== rooms) {
    //         res.status(400).json({ data: null, Status: { Code: 400, Message: 'RoomGuests length must equal NoOfRooms' } })
    //         return
    //     }
    //     for (let i = 0; i < RoomGuests.length; i++) {
    //         const g = RoomGuests[i]
    //         const adult = Number(g?.Adult) || 0
    //         const child = Number(g?.Child) || 0
    //         if (adult < 1) {
    //             res.status(400).json({ data: null, Status: { Code: 400, Message: `RoomGuests[${i}].Adult must be at least 1` } })
    //             return
    //         }
    //         if (!Array.isArray(g.ChildAge)) {
    //             res.status(400).json({ data: null, Status: { Code: 400, Message: `RoomGuests[${i}].ChildAge must be an array` } })
    //             return
    //         }
    //         if (g.ChildAge.length !== child) {
    //             res.status(400).json({ data: null, Status: { Code: 400, Message: `RoomGuests[${i}].ChildAge length must equal Child count` } })
    //             return
    //         }
    //     }
    // }

    // // validate optional fields
    // if (ResultCount !== undefined && (isNaN(Number(ResultCount)) || Number(ResultCount) < 0)) {
    //     res.status(400).json({ data: null, Status: { Code: 400, Message: 'ResultCount must be a non-negative number when provided' } })
    //     return
    // }
    // if (GuestNationality !== undefined && typeof GuestNationality !== 'string') {
    //     res.status(400).json({ data: null, Status: { Code: 400, Message: 'GuestNationality must be a string when provided' } })
    //     return
    // }
    // if (CountryCode !== undefined && typeof CountryCode !== 'string') {
    //     res.status(400).json({ data: null, Status: { Code: 400, Message: 'CountryCode must be a string when provided' } })
    //     return
    // }

    const data = {
        UserIp: "122.161.64.143",
        CheckInDate: dayjs(CheckInDate).format('YYYY-MM-DD'),
        CheckOutDate: dayjs(CheckOutDate).format('YYYY-MM-DD'),
        NoOfNights: Number(providedNights) || undefined,
        DestinationCityId: Number(DestinationCityId),
        ResultCount: ResultCount ?? null,
        GuestNationality: GuestNationality,
        NoOfRooms: Number(NoOfRooms) || 1,
        RoomGuests: Array.isArray(RoomGuests)
            ? RoomGuests.map(g => ({
                Adult: Number(g.Adult) || 1,
                Child: Number(g.Child) || 0,
                ChildAge: Array.isArray(g.ChildAge) ? g.ChildAge : []
            }))
            : [],
        MaxRating: Number(MaxRating) || 5,
        MinRating: Number(MinRating) || 1,
        CountryCode: CountryCode
    }

    console.log('Final Search Hotel Data:', data)

    const response = await bdsdApi<typeof data, HotelListResponse>(apiEndPoints.search, data)


    if(response.Error.ErrorMessage !== '') {
        res.status(500).json({
            data: response,
            Status: { Code: response.Error.ErrorCode, Message: response.Error.ErrorMessage }
        })

        return
    }

    res.status(200).json({
        data: response,
        Status: { Code: 200, Message: "Success" }
    })
}

export const hotelInfo = async (
    req: Request<any, any, any, {
        UserIp?: string,
        ResultIndex: string | number,
        HotelCode: string | number,
        SearchTokenId: string | number
    }>,
    res: Response<DefaultResponseBody<HotelInfoResponse>>
) => {
    const { UserIp, ResultIndex, HotelCode, SearchTokenId } = req.query

    if (ResultIndex === undefined || ResultIndex === null || String(ResultIndex).trim() === '') {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: 'ResultIndex is required' }
        })
        return
    }
    if (HotelCode === undefined || HotelCode === null) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: 'HotelCode is required and must be a number' }
        })
        return
    }
    if (SearchTokenId === undefined || SearchTokenId === null || String(SearchTokenId).trim() === '') {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: 'SearchTokenId is required' }
        })
        return
    }

    const data = {
        UserIp: UserIp || "122.161.64.143",
        ResultIndex: String(ResultIndex),
        HotelCode: Number(HotelCode),
        SearchTokenId: String(SearchTokenId)
    }

    const response = await bdsdApi<typeof data, HotelInfoResponse>(apiEndPoints.gethotelinfo, data)

    if (response.Error.ErrorMessage !== '') {
        res.status(500).json({
            data: response,
            Status: { Code: response.Error.ErrorCode, Message: response.Error.ErrorMessage }
        })

        return
    }

    res.status(200).json({
        data: response,
        Status: {
            Code: 200,
            Message: "Success"
        }
    })
}

export const hotelRoom = async (
    req: Request<any, any, any, {
        UserIp?: string,
        ResultIndex: string | number,
        HotelCode: string | number,
        SearchTokenId: string | number
    }>,
    res: Response<DefaultResponseBody<HotelRoomResponse>>
) => {
    const { UserIp, ResultIndex, HotelCode, SearchTokenId } = req.query

    console.log('Query Params:', req.query);

    if (ResultIndex === undefined || ResultIndex === null || String(ResultIndex).trim() === '') {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: 'ResultIndex is required' }
        })
        return
    }
    if (HotelCode === undefined || HotelCode === null) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: 'HotelCode is required and must be a number' }
        })
        return
    }
    if (SearchTokenId === undefined || SearchTokenId === null || String(SearchTokenId).trim() === '') {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: 'SearchTokenId is required' }
        })
        return
    }

    const data = {
        UserIp: UserIp || "122.161.64.143",
        ResultIndex: String(ResultIndex),
        HotelCode: Number(HotelCode),
        SearchTokenId: String(SearchTokenId)
    }

    const response = await bdsdApi<typeof data, HotelRoomResponse>(apiEndPoints.getroominfo, data)

    if (response.Error.ErrorMessage !== '') {
        res.status(500).json({
            data: response,
            Status: { Code: response.Error.ErrorCode, Message: response.Error.ErrorMessage }
        })

        return
    }

    res.status(200).json({
        data: response,
        Status: {
            Code: 200,
            Message: "Success"
        }
    })
}

export const blockRoom = async (
    req: Request<any, any, {
        UserIp: string;
        ResultIndex: string;
        HotelCode: number;
        HotelName: string;
        NoOfRooms: number;
        HotelRoomsDetails: { RoomIndex: number }[];
        SearchTokenId: string;
    }>,
    res: Response<DefaultResponseBody<HotelRoomResponse>>
) => {
    const { UserIp, ResultIndex, HotelCode, HotelName, NoOfRooms, HotelRoomsDetails, SearchTokenId } = req.body

    if (ResultIndex === undefined || ResultIndex === null || String(ResultIndex).trim() === '') {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: 'ResultIndex is required' }
        })
        return
    }
    if (HotelCode === undefined || HotelCode === null || isNaN(Number(HotelCode))) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: 'HotelCode is required and must be a number' }
        })
        return
    }
    if (SearchTokenId === undefined || SearchTokenId === null || String(SearchTokenId).trim() === '') {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: 'SearchTokenId is required' }
        })
        return
    }

    const data = {
        UserIp: UserIp || "122.161.64.143",
        ResultIndex: String(ResultIndex),
        HotelCode: Number(HotelCode),
        HotelName: String(HotelName),
        NoOfRooms: Number(NoOfRooms),
        HotelRoomsDetails: HotelRoomsDetails.map(r => ({ RoomIndex: Number(r.RoomIndex) })),
        SearchTokenId: String(SearchTokenId)
    }

    const response = await bdsdApi<typeof data, HotelRoomResponse>(apiEndPoints.blockroom, data)

    if (response.Error.ErrorMessage !== '') {
        res.status(500).json({
            data: response,
            Status: { Code: response.Error.ErrorCode, Message: response.Error.ErrorMessage }
        })

        return
    }

    res.status(200).json({
        data: response,
        Status: {
            Code: 200,
            Message: "Success"
        }
    })
}