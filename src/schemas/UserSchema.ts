import mongoose, { Document, Schema } from "mongoose";
import { formatIndianPhoneNumber } from "../functions";

export enum UserRole {
  SADMIN = "SADMIN",
  ViewAdmin = "ViewAdmin",
  CADMIN = "CADMIN",
  HR = "HR",
  EMPLOYEE = "EMPLOYEE",
  HotelOwner = "HotelOwner",
  USER = "USER",
}

export enum UserStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IUser extends Document {
  username: string;
  userRole: UserRole;
  email: string;
  photo: string;
  fullname: string;
  contact1: string;
  wallet: number;
  status: UserStatus;
  gstDetails: {
    gstNo: string;
    gstName: string;
    gstAddress: {
      address: string;
      state: string;
      pincode: string;
    };
  };
  address?: string;
  dob?: Date;
  gender?: string;
  createdBy?: string;
  companyId?: string | null;
  hrId?: string | null;
  passportDetails?: {
    passportNo: string;
    passportExpiry: string;
    passportIssue: string;
  };
  panNo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, unique: true, default: `user_${Date.now()}` },
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
  contact1: {
    type: String,
    required: true,
    unique: true,
    set: (v: string) => `91${formatIndianPhoneNumber(v).cleanedPhone}`,
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
  companyId: { type: String, default: null },
  hrId: { type: String, default: null },
  passportDetails: {
    passportNo: { type: String, default: "" },
    passportExpiry: { type: String, default: "" },
    passportIssue: { type: String, default: "" },
  },
  panNo: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>("User", UserSchema, "Users");
