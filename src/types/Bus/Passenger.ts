import { ObjectId } from 'mongodb';
export interface Passenger {
    _id?: ObjectId | string;
    LeadPassenger: boolean;
    Title: string;
    FirstName: string;
    LastName: string;
    Email: string;
    Phoneno: string;
    Gender: string;
    IdType: string | null;
    IdNumber: string | null;
    Address: string;
    Age: string;
    SeatName: string;
}