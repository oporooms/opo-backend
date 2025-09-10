export interface BookSeatResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: ErrorInfo;
    Result: BookingResult;
}

export interface ErrorInfo {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface BookingResult {
    BookingStatus: string;
    InvoiceAmount: number;
    InvoiceNumber: string;
    BookingID: number;
    TicketNo: string;
    TravelOperatorPNR: string;
}