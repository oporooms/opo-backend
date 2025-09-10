export interface FlightSearchProps {
    departureCity: string,
    arrivalCity: string,
    departureDate: string,
    returnDate?: string,
    adults: number,
    children: number,
    infants: number
    DirectFlight?: boolean,
    JourneyType: number,
    CabinClass: number,
}