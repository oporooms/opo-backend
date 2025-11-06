import { Request } from "express";
import { IUser } from "./user";

export interface SendOtpRequest extends Request {
  body: {
    phone: string;
  };
}

export interface VerifyOtpRequest extends Request {
  body: {
    phone: string;
    code: string;
  };
}

export interface RegisterRequest extends Request {
  body: IUser & {
    code: string;
    type: "email" | "phone";
  };
}

export interface LoginRequest extends Request {
  body: {
    phone: string;
  };
}