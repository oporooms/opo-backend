import mongoose, { Schema, model } from 'mongoose';
const AutoIncrement = require('mongoose-sequence')(mongoose);
import { HotelStatus, IHotel } from '@/types/hotel';
import axios from 'axios';
import { IUser, UserRole } from '@/types/user';

const PointSchema = new Schema<IHotel['location']>(
    {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true,
            // Accept an object with lat and lng, and convert it to [lng, lat]
            set(value: any): number[] {
                if (value && typeof value === 'object' && !Array.isArray(value) && 'lat' in value && 'lng' in value) {
                    return [Number(value.lng), Number(value.lat)];
                }
                return value;
            }
        }
    },
    { _id: false }
);

const AddressSchema = new Schema<IHotel['address']>(
    {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        placeId: { type: String, default: '' },
        City: { type: String, default: '' },
        Locality: { type: String, default: '' }
    },
    { _id: false }
);

const RoomSchema = new Schema<IHotel['rooms'][number]>(
    {
        type: { type: String, required: true },
        regularPrice: { type: Number, required: true, set: (v: string | number) => Number(v) },
        price: { type: Number, required: true, set: (v: string | number) => Number(v) },
        photos: { type: [String], required: true, default: [] },
        fee: { type: Number, default: 0, set: (v: string | number) => Number(v) },
        amenities: { type: [String], required: true, default: [] }
    },
    { _id: false }
);

const ViewSchema = new Schema<IHotel['views'][number]>(
    {
        title: { type: String, required: true },
        photos: { type: [String], required: true, default: [] }
    },
    { _id: false }
);

const HotelSchema = new Schema<IHotel>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        hotelOwnerId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
        location: { type: PointSchema },
        photos: { type: [String], required: true, default: [] },
        name: { type: String, required: true },
        address: { type: AddressSchema, required: true },
        customAddress: { type: String, required: true },
        desc: { type: String, required: true },
        rooms: { type: [RoomSchema], required: true, default: [] },
        status: { type: String, required: true, default: HotelStatus.PENDING },
        amenities: { type: [String], required: true, default: [] },
        rules: { type: [String], required: true, default: [] },
        views: { type: [ViewSchema], required: true, default: [] },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

// Pre-save hook to check if hotelOwnerId matches a User
HotelSchema.pre('save', async function (next) {
    try {
        const User = mongoose.model('User')
        const user = await User.findById(this.hotelOwnerId) as IUser;
        if (!user) {
            const err = new Error('hotelOwnerId does not match any User');
            (err as any).status = 400;
            (err as any).code = 1002;
            return next(err);
        }
        if(user.userRole !== UserRole.HotelOwner){
            const err = new Error('User is not a HotelOwner');
            (err as any).status = 403;
            (err as any).code = 1003;
            return next(err);
        }
        next();
    } catch (err) {
        return next(err as mongoose.CallbackError);
    }
});

// Custom validation for required fields
HotelSchema.pre('validate', function (next) {
    // Validate hotelOwnerId
    if (!this.hotelOwnerId || (typeof this.hotelOwnerId !== 'object' && typeof this.hotelOwnerId !== 'string')) {
        this.invalidate('hotelOwnerId', 'Invalid or missing hotelOwnerId', 1001);
    }
    // Validate photos
    if (!Array.isArray(this.photos) || this.photos.some((p: any) => typeof p !== 'string')) {
        this.invalidate('photos', 'Invalid or missing photos', 1004);
    }
    // Validate name
    if (!this.name || typeof this.name !== 'string') {
        this.invalidate('name', 'Invalid or missing name', 1005);
    }
    // Validate address
    if (!this.address || typeof this.address !== 'object' || typeof this.address.lat !== 'number' || typeof this.address.lng !== 'number') {
        this.invalidate('address', 'Invalid or missing Latitude and Longitude', 1006);
    }
    // Validate customAddress
    if (!this.customAddress || typeof this.customAddress !== 'string') {
        this.invalidate('customAddress', 'Invalid or missing customAddress', 1007);
    }
    // Validate desc
    if (!this.desc || typeof this.desc !== 'string') {
        this.invalidate('desc', 'Invalid or missing desc', 1008);
    }
    // Validate rooms
    if (!Array.isArray(this.rooms) || this.rooms.length === 0) {
        this.invalidate('rooms', 'Invalid or missing rooms', 1009);
    }
    // Validate status
    if (!this.status || typeof this.status !== 'string' || !(Object.values(HotelStatus) as string[]).includes(this.status)) {
        this.invalidate('status', 'Invalid or missing status', 1010);
    }
    next();
});

// Pre-save hook to set location coordinates from address lat and lng automatically.
HotelSchema.pre('save', function (next) {
    if (this.address && typeof this.address.lat === 'number' && typeof this.address.lng === 'number') {
        if (!this.location) this.location = {} as any;
        this.location.type = 'Point';
        this.location.coordinates = [this.address.lng, this.address.lat];
    }
    next();
});

// Pre-save hook to fill address fields using Google Maps Geocoding API if lat/lng are missing
HotelSchema.pre('save', async function (next) {
    if ((this.address.lat || this.address.lng)) {
        try {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) throw new Error('Google Maps API key not set');
            const response = await axios.get(
                'https://maps.googleapis.com/maps/api/geocode/json',
                {
                    params: {
                        latlng: `${this.address.lat},${this.address.lng}`,
                        key: apiKey
                    }
                }
            );
            const result = response.data.results[0];
            if (result) {
                const { lat, lng } = result.geometry.location;
                this.address.lat = lat;
                this.address.lng = lng;
                this.address.placeId = result.place_id;

                // Extract city and locality from address components
                let city = '';
                let locality = '';
                for (const comp of result.address_components) {
                    if (comp.types.includes('locality')) {
                        city = comp.long_name;
                    }
                    if (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1')) {
                        locality = comp.long_name;
                    }
                }
                this.address.City = city;
                this.address.Locality = locality;
            }
        } catch (err) {
            return next(err as Error);
        }
    }
    next();
});

HotelSchema.plugin(AutoIncrement, {
    id: 'hotelUId',
    inc_field: 'hotelUId',
    start_seq: 10000,
    prefix: 'OPO'
});

HotelSchema.index({ hotelUId: 1 });

export default model<IHotel>('Hotel', HotelSchema, 'Hotel');