export interface FlightData {
    UserIp: string;
    SearchTokenId: string;
    Error: Error;
    Result: FlightResult[][];
}

export interface Error {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface FlightResult {
    Segments: FlightSegment[][];
    FareList: FareInfo[];
    MinPublishedPrice: number;
}

export interface FlightSegment {
    TripIndicator: number;
    SegmentIndicator: number;
    Duration: number;
    TechStopPoint: any[];
    Craft: string;
    Airline: {
        AirlineCode: string;
        AirlineName: string;
        FlightNumber: number;
        FareClass: string;
        OperatingCarrier: string;
    };
    Origin: AirportInfo;
    Destination: AirportInfo;
    LayoverTime: number;
    Layover: string;
    TotalDuration: number;
}

export interface AirportInfo {
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

export interface FareInfo {
    FareId: string;
    IsRefundable: boolean;
    AirlineRemark: string;
    FareType: string;
    SeatBaggage: BaggageInfo[][];
    CabinClass: string;
    FareClass: string;
    Fare: FareDetails;
    FareBreakdown: {
        ADT: PassengerFare;
    };
    PublishedPrice: number;
    OfferedPrice: number;
}

export interface BaggageInfo {
    NoOfSeatAvailable: string;
    Sector: string;
    CheckIn: string;
    Cabin: string;
}

export interface FareDetails {
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
    GST: GSTInfo;
}

export interface GSTInfo {
    CGSTAmount: number;
    CGSTRate: number;
    IGSTAmount: number;
    IGSTRate: number;
    SGSTAmount: number;
    SGSTRate: number;
    TaxableAmount: number;
}

export interface PassengerFare {
    PassengerCount: number;
    BaseFare: number;
    Tax: number;
    YQTax: number;
    ServiceCharges: number;
}