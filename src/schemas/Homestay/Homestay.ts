import mongoose, { Schema, model } from 'mongoose';
const AutoIncrement = require('mongoose-sequence')(mongoose);
import axios from 'axios';
import { HomestayStatus, IHomestay } from '@/types/homestay';
import { IUser, UserRole } from '@/types/user';

const PointSchema = new Schema<IHomestay['location']>(
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

const AddressSchema = new Schema<IHomestay['address']>(
    {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        placeId: { type: String, default: '' },
        City: { type: String, default: '' },
        Locality: { type: String, default: '' }
    },
    { _id: false }
);

const UnitSchema = new Schema<IHomestay['units'][number]>(
    {
        type: { type: String, required: true },
        regularPrice: { type: Number, required: true, set: (v: string | number) => Number(v) },
        price: { type: Number, required: true, set: (v: string | number) => Number(v) },
        photos: { type: [String], required: true, default: [] },
        fee: { type: Number, default: 0, set: (v: string | number) => Number(v) },
        amenities: { type: [String], required: true, default: [] },
        maxAdults: { type: Number, required: true, default: 2 },
        maxChildren: { type: Number, required: true, default: 1 }
    },
    { _id: false }
);

const ViewSchema = new Schema<IHomestay['views'][number]>(
    {
        title: { type: String, required: true },
        photos: { type: [String], required: true, default: [] }
    },
    { _id: false }
);

const HomestaySchema = new Schema<IHomestay>(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        homestayOwnerId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
        location: { type: PointSchema },
        photos: { type: [String], required: true, default: [] },
        name: { type: String, required: true },
        address: { type: AddressSchema, required: true },
        customAddress: { type: String, required: true },
        desc: { type: String, required: true },
        units: { type: [UnitSchema], required: true, default: [] },
        status: { type: String, required: true, default: HomestayStatus.PENDING },
        amenities: { type: [String], required: true, default: [] },
        rules: { type: [String], required: true, default: [] },
        views: { type: [ViewSchema], required: true, default: [] },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

HomestaySchema.pre('save', async function (next) {
    try {
        const User = mongoose.model('User');
        const user = await User.findById(this.homestayOwnerId) as IUser;

        if (!user) {
            const err = new Error('homestayOwnerId does not match any User');
            return next(err);
        }

        if (user.userRole !== UserRole.HotelOwner && user.userRole !== UserRole.SADMIN) {
            const err = new Error('User is not allowed to create homestay');
            return next(err);
        }

        next();
    } catch (err) {
        return next(err as mongoose.CallbackError);
    }
});

HomestaySchema.pre('validate', function (next) {
    if (!this.homestayOwnerId || (typeof this.homestayOwnerId !== 'object' && typeof this.homestayOwnerId !== 'string')) {
        this.invalidate('homestayOwnerId', 'Invalid or missing homestayOwnerId');
    }
    if (!this.name || typeof this.name !== 'string') {
        this.invalidate('name', 'Invalid or missing name');
    }
    if (!this.address || typeof this.address !== 'object' || typeof this.address.lat !== 'number' || typeof this.address.lng !== 'number') {
        this.invalidate('address', 'Invalid or missing Latitude and Longitude');
    }
    if (!this.customAddress || typeof this.customAddress !== 'string') {
        this.invalidate('customAddress', 'Invalid or missing customAddress');
    }
    if (!this.desc || typeof this.desc !== 'string') {
        this.invalidate('desc', 'Invalid or missing desc');
    }
    if (!Array.isArray(this.units) || this.units.length === 0) {
        this.invalidate('units', 'Invalid or missing units');
    }
    if (!this.status || typeof this.status !== 'string' || !(Object.values(HomestayStatus) as string[]).includes(this.status)) {
        this.invalidate('status', 'Invalid or missing status');
    }
    next();
});

HomestaySchema.pre('save', function (next) {
    if (this.address && typeof this.address.lat === 'number' && typeof this.address.lng === 'number') {
        if (!this.location) this.location = {} as any;
        this.location.type = 'Point';
        this.location.coordinates = [this.address.lng, this.address.lat];
    }
    next();
});

HomestaySchema.pre('save', async function (next) {
    if ((this.address.lat || this.address.lng)) {
        try {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                next();
                return;
            }

            const response = await axios.get(
                'https://maps.googleapis.com/maps/api/geocode/json',
                {
                    params: {
                        latlng: `${this.address.lat},${this.address.lng}`,
                        key: apiKey
                    }
                }
            );
            const result = response.data.results?.[0];
            if (result) {
                const { lat, lng } = result.geometry.location;
                this.address.lat = lat;
                this.address.lng = lng;
                this.address.placeId = result.place_id;

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
        } catch {
            next();
            return;
        }
    }
    next();
});

HomestaySchema.plugin(AutoIncrement, {
    id: 'homestayUId',
    inc_field: 'homestayUId',
    start_seq: 10000,
    prefix: 'OPOHS'
});

HomestaySchema.index({ homestayUId: 1 });
HomestaySchema.index({ location: '2dsphere' });

export default model<IHomestay>('Homestay', HomestaySchema, 'Homestay');
