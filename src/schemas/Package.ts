import { Package, PackageCategory, PackageStatus } from "@/types/Package";
import mongoose, { Schema } from "mongoose";

const packageSchema = new Schema<Package>(
    {
        title: {type: String, required: true},
        description: {type: String, required: true},
        images: {type: [String], default: []},
        price: {
            sale: {type: Number, required: true, min: 0},
            regular: {type: Number, required: true, min: 0},
        },
        duration: {type: Date, required: true},
        category: {type: String, enum: Object.values(PackageCategory), required: true},
        city: {type: String, required: true},
        status: {type: String, enum: Object.values(PackageStatus), required: true},
        isFeatured: {type: Boolean, default: false},
        maxRooms: {type: Number, required: true, min: 1},
        flightAvailable: {type: Boolean, default: false},
        hotelAvailable: {type: Boolean, default: false},
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now},
    },
)

export default mongoose.model<Package>("Package", packageSchema, "Packages")