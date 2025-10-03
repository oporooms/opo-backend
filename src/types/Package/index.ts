import { ObjectId } from "mongoose";

export enum PackageCategory {
    DOMESTIC = "Domestic",
    INTERNATIONAL = "International",
}

export enum PackageStatus {
    ACTIVE = "Active",
    INACTIVE = "Inactive",
    DRAFT = "Draft",
    ARCHIVED = "Archived",
}

export interface Package {
    _id: ObjectId
    title: string;
    description: string;
    images: string[];
    price: {
        sale: number;
        regular: number;
    };
    duration: Date;
    category: PackageCategory;
    city: string;
    status: PackageStatus;
    isFeatured: boolean;
    maxRooms: number;
    flightAvailable?: boolean;
    hotelAvailable?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PackageRequestQuery {
    category?: PackageCategory;
    status?: PackageStatus;
    isFeatured?: boolean;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    durationFrom?: string; // ISO date string
    durationTo?: string;   // ISO date string
    page?: string;         // page number as string
    limit?: string;        // items per page as string
}