export interface BoardingPoint {
    CityPointIndex: number;
    CityPointLocation: string;
    CityPointName: string;
    CityPointTime: string;
}

export interface DroppingPoint {
    CityPointIndex: number;
    CityPointLocation: string;
    CityPointName: string;
    CityPointTime: string;
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

export interface BusPrice {
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

export interface CancellationPolicy {
    CancellationCharge: number;
    CancellationChargeType: number;
    PolicyString: string;
    TimeBeforeDept: string;
    FromDate: string;
    ToDate: string;
}

export interface Bus {
    Price: any;
    ResultIndex: string;
    ArrivalTime: string;
    AvailableSeats: number;
    DepartureTime: string;
    RouteId: string;
    BusType: string;
    ServiceName: string;
    TravelName: string;
    IdProofRequired: boolean;
    IsDropPointMandatory: boolean;
    LiveTrackingAvailable: boolean;
    MTicketEnabled: boolean;
    MaxSeatsPerTicket: number;
    OperatorId: number;
    PartialCancellationAllowed: boolean;
    BoardingPointsDetails: BoardingPoint[];
    DroppingPointsDetails: DroppingPoint[];
    BusPrice: BusPrice;
    CancellationPolicies: CancellationPolicy[];
}

export interface BusResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: {ErrorCode: number, ErrorMessage: string};
    Result: Bus[];
}