import type { BusListType } from "@/types/Bus/BusList";
import mongoose, { Schema } from "mongoose";

const BusListSchema: Schema = new Schema(
    {
        id: { type: Schema.Types.Mixed, required: true },
        city_id: { type: Schema.Types.Mixed, required: true },
        city_name: { type: String, required: true },
        priority: { type: Schema.Types.Mixed, required: true, default: null },
        skip: { type: Number, required: true }
    },
    { collection: 'BusList', timestamps: true }
);

export default mongoose.model<BusListType>("BusList", BusListSchema);