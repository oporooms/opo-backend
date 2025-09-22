import { ObjectId } from "mongoose";

export enum UserRole {
    SADMIN = "SADMIN",
    ViewAdmin = "ViewAdmin",
    CADMIN = "CADMIN",
    HR = "HR",
    EMPLOYEE = "EMPLOYEE",
    HotelOwner = "HotelOwner",
    USER = "USER",
    StateAgent = "StateAgent",
    CityAgent = "CityAgent",
    Agent = "Agent"
}

export enum UserStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
}

export interface IUser {
    _id?: ObjectId | string,
    userUId: string,
    username?: string;
    userRole: UserRole;
    email: string;
    photo?: string;
    fullname: string;
    phone: string;
    wallet?: number;
    status: UserStatus;
    gstDetails?: {
        gstNo: string;
        gstName: string;
        gstAddress: {
            address: string;
            state: string;
            pincode: string;
        };
    };
    address?: string;
    dob?: Date;
    gender?: string;
    createdBy?: UserRole;
    companyId?: string | null;
    hrId?: string | null;
    passportDetails?: {
        passportNo: string;
        passportExpiry: string;
        passportIssue: string;
    };
    panNo?: string;
    createdAt?: Date;
    updatedAt?: Date;
    token?: string;
    lastLogin?: Date | null;
}