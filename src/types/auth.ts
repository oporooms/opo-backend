import { Request, Response } from "express";
import { IUser } from "../schemas/UserSchema";

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
  body: IUser;
}

export interface RegisterResponse {
  message: string;
  success: boolean;
  data?: IUser;
  error?: any;
}

export interface LoginRequest extends Request {
  body: {
    phone: string;
  };
}

export interface LoginResponse {
  message: string;
  success: boolean;
  data?: IUser;
  error?: any;
}