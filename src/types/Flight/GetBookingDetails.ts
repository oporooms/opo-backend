export interface IGetBookingDetailsResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: IError;
    Result: IResult;
}

export interface IError {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface IResult {
    BookingId: number;
    JourneyType: number;
    TripIndicator: number;
    PNR: string;
    IsDomestic: boolean;
    IsManual: boolean;
    IsLCC: boolean;
    IsRefundable: boolean;
    FareType: string;
    Origin: string;
    Destination: string;
    AirlineCode: string;
    LastTicketDate: string;
    ValidatingAirlineCode: string;
    AirlineRemark: any;
    Fare: IFare;
    Passenger: IPassenger[];
    Segments: IFlightSegment[][];
    FareRules: IFareRule[];
    InvoiceAmount: number;
    InvoiceNo: string;
    InvoiceCreatedOn: string;
}

export interface IFare {
    BaseFare: number;
    Tax: number;
    YQTax: number;
    OtherCharges: number;
    Discount: number;
    PublishedPrice: number;
    OfferedPrice: number;
    AgentCommission: number;
    ServiceCharges: number;
    TDS: number;
    GST: IGST;
    TotalBaggageCharges: number;
    TotalMealCharges: number;
    TotalSeatCharges: number;
}

export interface IGST {
    CGSTAmount: number;
    CGSTRate: number;
    IGSTAmount: number;
    IGSTRate: number;
    SGSTAmount: number;
    SGSTRate: number;
    TaxableAmount: number;
}

export interface IPassenger {
    PaxId: number;
    Title: string;
    FirstName: string;
    LastName: string;
    PaxType: number;
    Gender: number;
    DateOfBirth: string;
    PAN: string;
    PassportNo: string;
    PassportExpiry: string;
    IsLeadPax: string;
    Email: string;
    ContactNo: string;
    AddressLine1: string;
    AddressLine2: string;
    City: string;
    CountryCode: string;
    CountryName: string;
    FFAirline: string;
    FFNumber: string;
    TicketNumber: string;
    Fare: IPassengerFare;
    Baggage: any[];
    Meal: any[];
    Seat: any[];
}

export interface IPassengerFare {
    BaseFare: number;
    Tax: number;
    YQTax: number;
    ServiceCharges: number;
    OtherCharges: number;
    Discount: number;
    AgentCommission: number;
    TDS: number;
    GSTAmount: number;
    PublishedPrice: number;
    OfferedPrice: number;
    BaggageCharges: number;
    MealCharges: number;
    SeatCharges: number;
}

export interface IFlightSegment {
    TripIndicator: number;
    SegmentIndicator: number;
    CheckInBaggage: string;
    CabinBaggage: string;
    CabinClass: string;
    Duration: number;
    TechStopPoint: any[];
    Craft: string;
    Airline: IAirline;
    Origin: IAirport;
    Destination: IAirport;
    LayoverTime: number;
    Layover: string;
    TotalDuration: number;
    AirlinePNR: string;
}

export interface IAirline {
    AirlineCode: string;
    AirlineName: string;
    FlightNumber: number;
    FareClass: string;
    OperatingCarrier: string;
}

export interface IAirport {
    AirportCode: string;
    AirportName: string;
    CityCode: string;
    CityName: string;
    CountryCode: string;
    CountryName: string;
    Terminal: string;
    DepartTime?: string;
    ArrivalTime?: string;
}

export interface IFareRule {
    Origin: string;
    Destination: string;
    Airline: string;
    FareBasisCode: string;
    FareRuleDetail: string;
    FareRestriction: string;
    FareFamilyCode: string;
    FareRuleIndex: string;
}