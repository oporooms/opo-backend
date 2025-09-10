import { ObjectId } from "mongodb";

export interface BusListType {
    _id: ObjectId | string;
    id: number;
    city_id: number;
    city_name: string;
    priority: string;
}