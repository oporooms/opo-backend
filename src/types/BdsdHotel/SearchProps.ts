
export interface RoomGuest {
    Adult: number;
    Child: number;
    ChildAge: number[]; // ages in years, empty array if no children
}

export interface SearchProps {
    CheckInDate: string; // ISO date string e.g. "2025-08-25"
    CheckOutDate: string; // ISO date string e.g. "2025-08-26"
    NoOfNights: number;
    CountryCode: string; // e.g. "IN"
    DestinationCityId: number;
    ResultCount: number | null;
    GuestNationality: string; // e.g. "IN"
    NoOfRooms: number;
    RoomGuests: RoomGuest[];
    MaxRating: number; // e.g. 5
    MinRating: number; // e.g. 1
    UserIp: string;
    CityName: string;
}