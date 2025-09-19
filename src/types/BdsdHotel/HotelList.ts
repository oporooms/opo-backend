export interface HotelListResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: ErrorInfo;
    Result: HotelResult[];
}

export interface ErrorInfo {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface HotelResult {
    IsHotDeal: boolean;
    ResultIndex: string;
    HotelCode: string;
    HotelName: string;
    HotelCategory: string;
    StarRating: number;
    HotelDescription: string;
    HotelPromotion?: string;
    HotelPolicy?: string;
    Price: PriceInfo;
    HotelPicture?: string;
    HotelAddress?: string;
    HotelContactNo?: string;
    HotelMap?: string | null;
    RecommendHotel?: boolean | null;
    Supplier?: string;
    Latitude?: string;
    Longitude?: string;
    HotelLocation?: any | null;
    // add other fields present in real responses as optional
    [key: string]: any;
}

export interface PriceInfo {
    RoomPrice: number;
    Tax: number;
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