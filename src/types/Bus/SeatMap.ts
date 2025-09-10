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

export interface SeatDetail {
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

export interface SeatLayout {
    NoOfColumns: number;
    NoOfRows: number;
    SeatDetails: SeatDetail[][];
}

export interface Result {
    AvailableSeats: string;
    HTMLLayout: string;
    SeatLayout: SeatLayout;
}

export interface Error {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface SeatResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: Error;
    Result: Result;
}