export interface BoardingPoint {
    CityPointAddress: string;
    CityPointContactNumber: string;
    CityPointIndex: number;
    CityPointLandmark: string;
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

export interface Error {
    ErrorCode: number;
    ErrorMessage: string;
}

export interface PointResults {
    BoardingPointsDetails: BoardingPoint[];
    DroppingPointsDetails: DroppingPoint[];
}

export interface BoardingPointResponse {
    UserIp: string;
    SearchTokenId: string;
    Error: Error;
    Result: PointResults;
}