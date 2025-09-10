import { ObjectId } from "mongodb";
import { SeatList } from "./SeatMap";

export interface Passengers {
    _id?: ObjectId | string
    Title: string;
    FirstName: string;
    LastName: string;
    PaxType: number;
    DateOfBirth: string;
    Gender: number;
    PassportNo: string;
    PassportExpiry: string;
    Nationality: string;
    PassportIssue: string;
    PAN: string;
    AddressLine1: string;
    AddressLine2: string;
    City: string;
    CountryCode: string;
    CountryName: string;
    ContactNo: string;
    Email: string;
    IsLeadPax: boolean;
    FFAirline: string;
    FFNumber: string;
    Baggage: any[];
    Meal: any[];
    Seat?: SeatList[]
    GSTCompanyAddress: string;
    GSTCompanyContactNumber: string;
    GSTCompanyName: string;
    GSTNumber: string;
    GSTCompanyEmail: string;
}

interface GST {
    CGSTAmount: number;
    CGSTRate: number;
    IGSTAmount: number;
    IGSTRate: number;
    SGSTAmount: number;
    SGSTRate: number;
    TaxableAmount: number;
}

interface Fare {
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
    GST: GST;
    TotalBaggageCharges: number;
    TotalMealCharges: number;
    TotalSeatCharges: number;
}

interface PassengerFare {
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

interface Passenger extends Passengers {
    PaxId: number;
    TicketNumber: string;
    Fare: PassengerFare;
    Seat: any[];
}

interface Airline {
    AirlineCode: string;
    AirlineName: string;
    FlightNumber: number;
    FareClass: string;
    OperatingCarrier: string;
}

interface Location {
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

interface Segment {
    TripIndicator: number;
    SegmentIndicator: number;
    CheckInBaggage: string;
    CabinBaggage: string;
    CabinClass: string;
    Duration: number;
    TechStopPoint: any[];
    Craft: string;
    LayoverTime: number;
    Airline: Airline;
    Origin: Location;
    Destination: Location;
    Layover: string;
    TotalDuration: number;
    AirlinePNR: string;
}

type Segments = Segment[][];

interface Result {
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
    AirlineRemark: string;
    Fare: Fare;
    Passenger: Passenger[];
    Segments: Segments;
    FareRules: any[];
    InvoiceAmount: number;
    InvoiceNo: string;
    InvoiceCreatedOn: string;
}

interface ErrorInfo {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface BookingResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: ErrorInfo;
    Result: Result;
}