import mongoose, { Schema, model } from 'mongoose';
import { getNextId } from '@/functions/mongoFunc';
import { IRooms } from '@/types/rooms';

const roomSchema = new Schema<IRooms>({
    hotelOwnerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hotelId: {
        type: Schema.Types.ObjectId,
        ref: 'Hotel',
        required: true
    },
    number: {
        type: Number,
        required: true,
        default: 1
    },
    type: {
        type: String,
        required: true,
        default: 'Standard'
    },
    floorNumber: {
        type: Number,
        required: true,
        default: -1
    },
    isActive: {
        type: Boolean,
        default: true
    },
});

roomSchema.index({ }, { unique: true });

roomSchema.pre('save', async function (next) {
    if (this.isNew) {
        const existing = await mongoose.models.Room.findOne({
            hotelId: this.hotelId,
            type: this.type,
            number: this.number
        });
        if (existing) {
            return next(new Error('Room with the same number and type already exists in this hotel.'));
        } else {
            next()
        }
    } else {
        next();
    }
});

export default model<IRooms>('Room', roomSchema, 'Room');