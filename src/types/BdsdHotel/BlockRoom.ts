export interface BlockRoomRequest {
    UserIp: string;
    ResultIndex: string;
    HotelCode: number;
    HotelName: string;
    NoOfRooms: number;
    HotelRoomsDetails: { RoomIndex: number }[];
    SearchTokenId: string;
}

export interface BlockRoomResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: ResponseError;
    Result: BlockRoomResult;
}

export interface ResponseError {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface BlockRoomResult {
    IsCancellationPolicyChanged: boolean;
    IsHotelPolicyChanged: boolean;
    IsPriceChanged: boolean;
    IsPackageFare: boolean;
    IsDepartureDetailsMandatory: boolean;
    IsPackageDetailsMandatory: boolean;
    AvailabilityType: string;
    GSTAllowed: boolean;
    HotelNorms: string;
    HotelName: string;
    AddressLine1: string;
    AddressLine2: string;
    StarRating: number;
    HotelPolicyDetail: string;
    Latitude: string;
    Longitude: string;
    BookingAllowedForRoamer: boolean;
    AncillaryServices: any[];
    HotelRoomsDetails: HotelRoomDetail[];
    ValidationsAtConfirm: string;
    InventorySource: string;
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
    Price: PriceDetail;
    RoomPromotion: string;
    Amenities: string[];
    Amenity: any[];
    SmokingPreference: string;
    BedTypes: string[];
    HotelSupplements: any[];
    LastCancellationDate: string;
    SupplierSpecificData: string;
    CancellationPolicies: CancellationPolicy[];
    LastVoucherDate: string;
    CancellationPolicy: string;
    Inclusion: string[];
    IsPassportMandatory: boolean;
    IsPANMandatory: boolean;
    BeddingGroup: any | null;
}

export interface PriceDetail {
    RoomPrice: number;
    Tax: number;
    OtherCharges: number;
    Discount: number;
    PublishedPrice: number;
    OfferedPrice: number;
    AgentCommission: number;
    ServiceCharges: number;
    TDS: number;
    GST: GSTDetail;
}

export interface GSTDetail {
    CGSTAmount: number;
    CGSTRate: number;
    IGSTAmount: number;
    IGSTRate: number;
    SGSTAmount: number;
    SGSTRate: number;
    TaxableAmount: number;
}

export interface CancellationPolicy {
    Charge: number;
    ChargeType: number;
    Currency: string;
    FromDate: string;
    ToDate: string;
}