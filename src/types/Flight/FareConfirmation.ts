export interface FareConfirmation {
    UserIp: string;
    SearchTokenId: string;
    Error: FareError;
    FlightDetailChangeInfo: any; // can be extended when structure is known
    IsPriceChanged: boolean;
    Result: FareConfirmationResult;
}

export interface FareError {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface FareConfirmationResult {
    ResultIndex: string;
    IsLCC: boolean;
    IsRefundable: boolean;
    IsAdultDOBMandatory: boolean;
    IsADTDOBRequired: boolean;
    IsCHDDOBRequired: boolean;
    IsINFTDOBRequired: boolean;
    IsPanRequiredAtBook: boolean;
    IsPassportRequiredAtBook: boolean;
    IsDocumentIdAllowed: boolean;
    IsDocumentIdMandatory: boolean;
    GSTAllowed: boolean;
    IsGSTMandatory: boolean;
    AirlineRemark: string;
    FareType: string;
    Fare: Fare;
    FareBreakdown: FareBreakdown;
    Segments: FlightSegment[][];
    LastTicketDate: string;
    TicketAdvisory: string;
    ValidatingAirline: string;
}

export interface Fare {
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

export interface FareBreakdown {
    ADT: FareBreakdownDetail;
}

export interface FareBreakdownDetail {
    PassengerCount: number;
    BaseFare: number;
    Tax: number;
    YQTax: number;
    ServiceCharges: number;
}

export interface FlightSegment {
    TripIndicator: number;
    SegmentIndicator: number;
    CheckInBaggage: string;
    CabinBaggage: string;
    CabinClass: string;
    Duration: number;
    TechStopPoint: any[]; // adjust type if needed
    Craft: string;
    LayoverTime: number;
    Airline: Airline;
    Origin: AirportInfo;
    Destination: AirportInfo;
    Layover: string;
    TotalDuration: number;
}

export interface Airline {
    AirlineCode: string;
    AirlineName: string;
    FlightNumber: number;
    FareClass: string;
    OperatingCarrier: string;
}

export interface AirportInfo {
    AirportCode: string;
    AirportName: string;
    CityCode: string;
    CityName: string;
    CountryCode: string;
    CountryName: string;
    Terminal: string;
    DepartTime?: string;  // present for Origin
    ArrivalTime?: string; // present for Destination
}