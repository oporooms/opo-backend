import { GSTDetails } from "@/types";
import { Schema } from "mongoose";

export const GSTDetailsSchema = new Schema<GSTDetails>(
    {
        gstNo: { type: String, default: "" },
        gstName: { type: String, default: "" },
        gstAddress: {
            address: { type: String, default: "" },
            state: { type: String, default: "" },
            pincode: { type: String, default: "" },
        },
    }, { _id: false }
)