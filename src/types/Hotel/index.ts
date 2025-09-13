import { ObjectId } from "mongoose";

export interface SearchCityForHotelResponse {
    cityId: number;
    city: string;
    state: string;
    stateCode: string;
    country: string;
    countryCode: string;
}

export interface BdsdHotelCityList {
    _id?: ObjectId | string;
    id: number;
    city_id: number;
    destination: string;
    state_province: string;
    state_province_code: string;
    country: string;
    country_code: string;
    update_status: string | null;
    priority: number | null;
}