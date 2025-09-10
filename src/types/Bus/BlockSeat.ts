export interface BoardingPointDetails {
    CityPointAddress: string;
    CityPointContactNumber: string;
    CityPointIndex: number;
    CityPointLandmark: string;
    CityPointLocation: string;
    CityPointName: string;
    CityPointTime: string;
}

export interface CancellationPolicy {
    CancellationCharge: number;
    CancellationChargeType: number;
    PolicyString: string;
    TimeBeforeDept: string;
    FromDate: string;
    ToDate: string;
}

export interface GST {
    CGSTAmount: number;
    CGSTRate: number;
    IGSTAmount: number;
    IGSTRate: number;
    SGSTAmount: number;
    SGSTRate: number;
    TaxableAmount: number;
}

export interface Price {
    BasePrice: number;
    Tax: number;
    OtherCharges: number;
    Discount: number;
    PublishedPrice: number;
    OfferedPrice: number;
    AgentCommission: number;
    ServiceCharges: number;
    TDS: number;
    GST: GST;
}

export interface Seat {
    ColumnNo: string;
    Height: number;
    IsLadiesSeat: boolean;
    IsMalesSeat: boolean;
    IsUpper: boolean;
    RowNo: string;
    SeatFare: number;
    SeatIndex: number;
    SeatName: string;
    SeatStatus: boolean;
    SeatType: number;
    Width: number;
    Price: Price;
}

export interface Passenger {
    LeadPassenger: boolean;
    Title: string;
    Address: string;
    Age: number;
    City: string | null;
    Email: string;
    FirstName: string;
    Gender: number;
    IdNumber: string | null;
    IdType: string | null;
    LastName: string;
    Phoneno: string;
    Seat: Seat;
    State: string | null;
}

export interface Result {
    IsPriceChanged: boolean;
    ArrivalTime: string;
    BusType: string;
    DepartureTime: string;
    TravelName: string;
    BoardingPointdetails: BoardingPointDetails;
    CancelPolicy: CancellationPolicy[];
    Passenger: Passenger[];
}

export interface Error {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface BlockSeat {
    UserIp: string;
    SearchTokenId: string;
    Error: Error;
    Result: Result;
}