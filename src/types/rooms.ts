import { Types } from "mongoose"

export interface IRooms {
    _id: string,
    hotelOwnerId: Types.ObjectId,
    hotelId: Types.ObjectId,
    number: number,
    type: string,
    floorNumber: number,
    isActive: boolean
}

export interface RoomVarietyTypes {
    id?: number,
    type: string,
    regularPrice: string | number,
    price: string | number,
    timing?: string,
    photos: string[],
    fee: string | number,
    amenities: string[],
}