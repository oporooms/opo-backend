export interface CancelBookingError {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface CancelBookingResult {
    PaxId: number;
    Remarks: string;
}

export interface CancelBookingResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: CancelBookingError;
    Result: CancelBookingResult[];
}