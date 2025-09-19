export interface HotelRoomRequest {
    UserIp: string;
    ResultIndex: string;
    HotelCode: number;
    SearchTokenId: string;
}

export interface HotelRoomError {
    ErrorCode: number;
    ErrorMessage: string;
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

export interface Price {
    RoomPrice: number;
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

export interface CancellationPolicyEntry {
    Charge: number;
    ChargeType: number;
    Currency: string;
    FromDate: string;
    ToDate: string;
}

export interface HotelRoomDetail {
    AvailabilityType: string;
    ChildCount: number;
    RequireAllPaxDetails: boolean;
    RoomId: number;
    RoomStatus: number;
    RoomIndex: number;
    RoomTypeCode: string;
    RoomDescription: string;
    RoomTypeName: string;
    RatePlanCode: string;
    RatePlan: number;
    RatePlanName: string;
    InfoSource: string;
    SequenceNo: string;
    IsPerStay: boolean;
    SupplierPrice: number | null;
    Price: Price;
    RoomPromotion: string;
    Amenities: string[];
    Amenity: any[]; // kept as any[] because example shows empty array; tighten if known
    SmokingPreference: string;
    BedTypes: any[]; // keep generic
    HotelSupplements: any[]; // keep generic
    LastCancellationDate: string;
    CancellationPolicies: CancellationPolicyEntry[];
    LastVoucherDate: string;
    CancellationPolicy: string;
    Inclusion: string[];
    IsPassportMandatory: boolean;
    IsPANMandatory: boolean;
    BeddingGroup: any | null;
}

export interface HotelRoomResult {
    IsUnderCancellationAllowed: boolean;
    IsPolicyPerStay: boolean;
    HotelRoomsDetails: HotelRoomDetail[];
}

export interface HotelRoomResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: HotelRoomError;
    Result: HotelRoomResult;
}