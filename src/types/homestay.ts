import { Types } from "mongoose";

export enum HomestayStatus {
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

interface IUnit {
    type: string;
    regularPrice: number;
    price: number;
    photos: string[];
    fee?: number;
    amenities: string[];
    maxAdults: number;
    maxChildren: number;
}

interface IView {
    title: string;
    photos: string[];
}

export interface IHomestay {
    _id: Types.ObjectId;
    homestayOwnerId: Types.ObjectId;
    homestayUId: number;
    location: IGeoPoint;
    photos: string[];
    name: string;
    address: IAddress;
    customAddress: string;
    desc: string;
    units: IUnit[];
    status: HomestayStatus;
    amenities: string[];
    rules: string[];
    views: IView[];
    createdAt: Date;
    updatedAt: Date;
}

export interface SearchHomestay {
    homestayOwnerId?: string;
    name?: string;
    city?: string;
    locality?: string;
    lat?: string;
    lng?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    units?: string;
    unit?: string;
    rooms?: string;
    minPrice?: string;
    maxPrice?: string;
    amenities?: string;
    skip?: string;
    limit?: string;
}
