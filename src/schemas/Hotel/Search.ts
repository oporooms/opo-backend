import { BdsdHotelCityList } from '@/types/Hotel/index';
import mongoose, { Schema, model } from 'mongoose';

const BdsdHotelCityListSchema = new Schema<BdsdHotelCityList>(
    {
        id: { type: Number, required: true, unique: true },
        city_id: { type: Number, required: true },
        destination: { type: String, required: true, trim: true },
        state_province: { type: String, required: true, trim: true },
        state_province_code: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
        country_code: { type: String, required: true, trim: true },
        update_status: { type: String, default: null },
        priority: { type: Number, default: null }
    },
    { _id: false }
);

export default model<BdsdHotelCityList>('BdsdHotelCityList', BdsdHotelCityListSchema, 'BdsdHotelCityList');
