export interface FlightError {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface FlightSeatMap {
    UserIp: string;
    SearchTokenId: string;
    Error: FlightError;
    Result: {
        Baggage: Baggage[][],
        Meal: Meal[][],
        Seats?: Seat[][]
    };
}

export interface Baggage {
    Key: string;
    AirlineCode: string;
    FlightNumber: string;
    WayType: number;
    Code: string;
    Description: number;
    AirlineDescription: string;
    Weight: string;
    Price: number;
    Origin: string;
    Destination: string;
}

export interface Meal {
    Key: string;
    AirlineCode: string;
    FlightNumber: string;
    WayType: number;
    Code: string;
    Quantity: number;
    AirlineDescription: string;
    Description: number;
    Price: number;
    Origin: string;
    Destination: string;
}

export interface Seat {
    Origin: string;
    Destination: string;
    ul: object
}

export interface SeatList {
    Key: string;
    AirlineCode: string;
    FlightNumber: string;
    CraftType: string;
    Origin: string;
    Destination: string;
    AvailablityType: number;
    Description: number;
    Code: string;
    RowNo: number;
    SeatNo: string;
    SeatType: number;
    SeatWayType: number;
    Compartment: number;
    Deck: number;
    Currency: string;
    Price: number;
    SeatClass: string;
    seatselect: boolean;
    WingSeat: number;
}