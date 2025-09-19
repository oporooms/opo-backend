export interface HotelInfoRequest {
    UserIp: string;
    ResultIndex: string;
    HotelCode: number;
    SearchTokenId: string;
}

export interface HotelInfoError {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface HotelResult {
    HotelName: string;
    StarRating: number;
    HotelURL: string | null;
    Description: string;
    Attractions: string | null;
    HotelFacilities: string[];
    HotelPolicy: string | null;
    SpecialInstructions: string | null;
    HotelPicture: string | null;
    Images: string[];
    ImagesALTTAGS: string[] | null;
    Address: string;
    CountryName: string;
    PinCode: string;
    HotelContactNo: string;
    FaxNumber: string;
    Email: string | null;
    Latitude: number | null;
    Longitude: number | null;
    RoomData: any | null;
    RoomFacilities: any | null;
    Services: any | null;
}

export interface HotelInfoResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: HotelInfoError;
    Result: HotelResult;
}