import { Types } from "mongoose";

export enum HotelStatus {
    PENDING = "pending",
    DECLINED = "declined",
    APPROVED = "approved"
}

interface IGeoPoint {
    type: 'Point';
    coordinates: [number, number];
}

interface IAddress {
    lat: number;
    lng: number;
    placeId: string;
    City: string;
    Locality?: string;
}

interface IRoom {
    type: string;
    regularPrice: number;
    price: number;
    photos: string[];
    fee?: number;
    amenities: string[];
}

interface IView {
    title: string;
    photos: string[];
}

export interface IHotel {
    hotelOwnerId: Types.ObjectId;
    hotelUId: number;
    location: IGeoPoint;
    photos: string[];
    name: string;
    address: IAddress;
    customAddress: string;
    desc: string;
    rooms: IRoom[];
    status: HotelStatus;
    amenities: string[];
    rules: string[];
    views: IView[];
    createdAt: Date;
    updatedAt: Date;
}

export interface SearchHotel {
    hotelOwnerId: string;
    name: string;
    nameNot: string;
    customAddress: string;
    desc: string;
    city: string;
    locality: string;
    lat: string;
    lng: string;
    placeId: string;
    regularPrice: string;
    salePrice: string;
    minPrice: string;
    maxPrice: string;
    minRating: string;
    maxRating: string;
    amenities: string;
    sort: string;
    userId: string;
    skip: string;
    limit: string;
    nextId: string;
}