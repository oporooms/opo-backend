export interface FlightAirportList {
    _id: string;
    id: number;
    code: string;
    name: string;
    city_code: string;
    city_name: string;
    country_name: string;
    country_code: string;
    airportorder: number | null;
}