import { FlightAirportList } from "@/types/Flight/flightlist";
import mongoose, { Schema } from "mongoose";

const FlightAirportListSchema: Schema = new Schema(
    {
        _id: { type: String, required: true },
        id: { type: Number, required: true },
        code: { type: String, required: true },
        name: { type: String, required: true },
        city_code: { type: String, required: true },
        city_name: { type: String, required: true },
        country_name: { type: String, required: true },
        country_code: { type: String, required: true },
        airportorder: { type: Number, required: true }
    }
)

export default mongoose.model<FlightAirportList>("FlightAirportList", FlightAirportListSchema);