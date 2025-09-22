import mongoose, { Schema, Types } from "mongoose";
import { formatIndianPhoneNumber } from "../functions";
import { IUser, UserRole, UserStatus } from "@/types/user";
const AutoIncrement = require('mongoose-sequence')(mongoose);

const UserSchema = new Schema<IUser>({
  username: { type: String, unique: true, default: `user_${Date.now()}`, },
  userRole: {
    type: String,
    required: true,
    enum: Object.values(UserRole),
    default: UserRole.USER,
  },
  email: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        // Simple email regex for validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid email address!`,
    },
  },
  photo: { type: String },
  fullname: { type: String, required: true },
  phone: {
    type: String,
    required: true,
    unique: true,
    set: (v: string) => formatIndianPhoneNumber(v).cleanedPhone,
    validate: {
      validator: (v: string) => {
        return formatIndianPhoneNumber(v).ErrorCode === 0;
      },
      message: (props: any) =>
        `${props.value} is not a valid Indian phone number!`,
    },
  },
  wallet: { type: Number, default: 0 },
  status: {
    type: String,
    required: true,
    enum: Object.values(UserStatus),
    default: UserStatus.APPROVED,
  },
  gstDetails: {
    gstNo: { type: String, default: "" },
    gstName: { type: String, default: "" },
    gstAddress: {
      address: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },
  },
  address: { type: String, default: "" },
  dob: { type: Date, default: null },
  gender: { type: String, default: "" },
  createdBy: { type: String, default: "" },
  companyId: { type: Types.ObjectId, default: null, ref: 'User' },
  hrId: { type: Types.ObjectId, default: null, ref: 'User' },
  passportDetails: {
    passportNo: { type: String, default: "" },
    passportExpiry: { type: String, default: "" },
    passportIssue: { type: String, default: "" },
  },
  panNo: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  token: { type: String, default: "" },
  lastLogin: { type: Date, default: null },
});

UserSchema.pre('validate', function (next) {
  const requiredFields = ['username', 'userRole', 'email', 'fullname', 'phone'];
  const self = this as any;
  for (const field of requiredFields) {
    if (!self[field] || (typeof self[field] === 'string' && self[field].trim() === '')) {
      self.invalidate(field, `${field} is required`);
    }
  }
  next();
});

UserSchema.plugin(AutoIncrement, {
  id: 'userUId',
  inc_field: 'userUId',
  start_seq: 10000,
});

UserSchema.index({ userUId: 1 });

export default mongoose.model<IUser>("User", UserSchema, "User");
