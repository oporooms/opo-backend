import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
    id: string;
    reference_value?: any;
    seq: number;
}

const CounterSchema: Schema = new Schema(
    {
        id: { type: String, required: true, unique: true },
        reference_value: { type: Schema.Types.Mixed, default: null },
        seq: { type: Number, required: true }
    },
    { timestamps: true }
);

export default mongoose.model<ICounter>('Counter', CounterSchema);