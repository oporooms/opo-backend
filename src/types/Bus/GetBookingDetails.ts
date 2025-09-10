export interface IGetBookingDetails {
    UserIp: string;
    SearchTokenId: string;
    Error: IError;
    Result: IBookingDetails;
    ResultIndex?: string;
    BoardingPointId?: number;
    DroppingPointId?: number;
}

export interface IError {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface IBookingDetails {
    BookingId: number;
    TicketNo: string;
    TravelOperatorPNR: string;
    Origin: string;
    OriginID: number;
    Destination: string;
    DestinationId: number;
    DateOfJourney: string;
    NoOfSeats: number;
    DepartureTime: string;
    ArrivalTime: string;
    Duration: number;
    BusType: string;
    TravelName: string;
    Passenger: IPassenger[];
    BoardingPointdetails: IBoardingPoint;
    DroppingPointdetails: IDroppingPoint;
    CancelPolicy: ICancelPolicy[];
    Price: IPrice;
    InvoiceNumber: string;
    InvoiceAmount: number;
    InvoiceCreatedOn: string;
}

export interface IPassenger {
    LeadPassenger: boolean;
    Title: string;
    FirstName: string;
    LastName: string;
    Age: string;
    Gender: string;
    Phoneno: string;
    Email: string;
    IdNumber: string | null;
    IdType: string | null;
    Address: string;
    SeatName: string;
    SeatId: string;
    Seat: ISeat;
}

export interface ISeat {
    IsLadiesSeat: boolean;
    IsMalesSeat: boolean;
    IsUpper: boolean;
    SeatFare: number;
    SeatName: string;
    SeatStatus: boolean;
    SeatType: number;
    Price: IPrice;
}

export interface IPrice {
    BasePrice: number;
    Tax: number;
    OtherCharges: number;
    Discount: number;
    PublishedPrice: number;
    OfferedPrice: number;
    AgentCommission: number;
    ServiceCharges: number;
    TDS: number;
    GST: IGst;
}

export interface IGst {
    CGSTAmount: number;
    CGSTRate: number;
    IGSTAmount: number;
    IGSTRate: number;
    SGSTAmount: number;
    SGSTRate: number;
    TaxableAmount: number;
}

export interface IBoardingPoint {
    CityPointAddress: string;
    CityPointContactNumber: string;
    CityPointIndex: number;
    CityPointLandmark: string;
    CityPointLocation: string;
    CityPointName: string;
    CityPointTime: string;
}

export interface IDroppingPoint {
    CityPointIndex: number;
    CityPointLocation: string;
    CityPointName: string;
    CityPointTime: string;
}

export interface ICancelPolicy {
    CancellationCharge: number;
    CancellationChargeType: number;
    PolicyString: string;
    TimeBeforeDept: string;
    FromDate: string;
    ToDate: string;
}