export interface CancelBookingResponse {
    SendChangeRequestResult: SendChangeRequestResult;
}

export interface SendChangeRequestResult {
    ResponseStatus: number;
    Error: ErrorInfo;
    TraceId: string;
    BusCRInfo: BusCRInfo[];
}

export interface ErrorInfo {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface BusCRInfo {
    CancellationChargeBreakUp: CancellationChargeBreakUp;
    ChangeRequestId: number;
    CreditNoteNo: string;
    ChangeRequestStatus: number;
    CreditNoteCreatedOn: string;
    TotalPrice: number;
    RefundedAmount: number;
    CancellationCharge: number;
    TotalServiceCharge: number;
    TotalGSTAmount: number;
    GST: GST;
}

export interface CancellationChargeBreakUp {
    CancellationFees: number;
    CancellationServiceCharge: number;
}

export interface GST {
    CGSTAmount: number;
    CGSTRate: number;
    CessAmount: number;
    CessRate: number;
    IGSTAmount: number;
    IGSTRate: number;
    SGSTAmount: number;
    SGSTRate: number;
    TaxableAmount: number;
}