import { User } from "../Profile"
import { BlockSeat, Error } from "./BlockSeat"
import { BoardingPoint, BoardingPointResponse, DroppingPoint } from "./BoardingPoints"
import { BookSeatResponse } from "./BookSeat"
import { IGetBookingDetails } from "./GetBookingDetails"
import { Passenger } from "./Passenger"
import { SeatDetail, SeatResponse } from "./SeatMap"
import { PaymentMode } from "../oldcode/Booking"

export type CheckoutProps = { boardingPoints: BoardingPointResponse, seatMaps: SeatResponse, usersForCadmin: User[], markup: number }
export type BoardingPoints = { BoardingPointId: BoardingPoint['CityPointIndex'], DroppingPointId: DroppingPoint['CityPointIndex'] }

export type initialTypes = {
    selectedSeat: SeatDetail[]
    selectedBoardingPoint: BoardingPoints
    passengerDetails: Passenger[]

    //data came from api
    blockSeat: BlockSeat | null
    bookingResponse: IGetBookingDetails | null
    getBookingDetails: IGetBookingDetails | null
    paymentMode: PaymentMode

    //loading, msg and error
    loading: boolean
    msg: string
    error: Error
}

export enum reducerActionTypes {
    SELECTED_SEATS = 'SELECTED_SEATS',
    SELECTED_BOARDING_POINT = 'SELECTED_BOARDING_POINT',
    PASSENGER_DETAILS = 'PASSENGER_DETAILS',
    BLOCK_SEAT = 'BLOCK_SEAT',
    BOOKING_RESPONSE = 'BOOKING_RESPONSE',
    LOADING = 'LOADING',
    MSG = 'MSG',
    ERROR = 'ERROR',
    GET_BOOKING_DETAILS = 'GET_BOOKING_DETAILS',
    CREATE_ORDER = 'CREATE_ORDER',
    Payment_Status = 'Payment_Status',
    PAYMENT_MODE = 'PAYMENT_MODE',
}

export type reducerActionPayload =
    | SeatDetail[]
    | BoardingPoints
    | Passenger[]
    | BlockSeat
    | BookSeatResponse
    | boolean
    | string
    | Error
    | IGetBookingDetails
    | PaymentMode

export type ComponentProps = {
    dispatch?: React.Dispatch<{ type: reducerActionTypes, payload: reducerActionPayload }>;
    seatMaps?: SeatResponse
    boardingPoints?: BoardingPointResponse
    state: initialTypes,
    usersForCadmin?: User[],
    markup?: number
}