import { Response } from "express";
import User from "@/schemas/UserSchema";
import jwt from "jsonwebtoken";
import Otp from "@/schemas/OtpSchema";
import IpSchema from "@/schemas/IpSchema";
import { formatIndianPhoneNumber } from "@/functions";
import axios from "axios";
import ip from "ip";
import bcryptjs from "bcryptjs";
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  SendOtpRequest,
  VerifyOtpRequest,
} from "../types/auth";
import { DefaultResponseBody } from "@/types/default";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export const sendOtp = async (
  req: SendOtpRequest,
  res: Response<DefaultResponseBody>
) => {
  const { phone } = req.body;

  const isValidPhone = formatIndianPhoneNumber(phone);

  if (isValidPhone.ErrorCode !== 0) {
    res.status(400).json({
      message: isValidPhone.ErrorMessage,
      success: false,
    });
    return;
  }

  const validate = `91${formatIndianPhoneNumber(phone).cleanedPhone}`;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const defaultNum = [
    "918435289879",
    "918874059274",
    "917007498505",
    "919792047144",
    "916387183902",
    "918088676065",
    "917483462760",
    "917766942151",
  ];
  const randomCode = defaultNum.includes(validate) ? "123456" : otp;
  const userIp =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    ip.address();

  const now = new Date();
  const ipRecord = await IpSchema.findOne({ userIp, phone: validate });

  if (
    ipRecord &&
    ipRecord.date > new Date(now.getTime() - 60 * 60 * 1000) &&
    ipRecord.otpCount >= 3
  ) {
    res.status(400).json({
      message: "OTP request limit exceeded. Try again after 1 hour.",
      success: false,
    });
    return;
  }

  // Only update date if otpCount is less than 4
  if (ipRecord) {
    const update: any = { $inc: { otpCount: 1 } };
    if (ipRecord.otpCount < 3) {
      update.$set = { date: now };
    }
    await IpSchema.updateOne({ userIp, phone: validate }, update, {
      upsert: true,
    });
  } else {
    await IpSchema.updateOne(
      { userIp, phone: validate },
      { $set: { otpCount: 1, date: now } },
      { upsert: true }
    );
  }

  if (!defaultNum.includes(validate)) {
    await axios.get(
      `http://136.243.171.112/api/sendhttp.php?authkey=37336b756d617232383803&mobiles=${validate}&message=Dear User, \nYour OTP for Login to oporooms.com is ${randomCode}. Please do not share it. \nWith Regards OPO Rooms.&sender=OPOROM&route=2&country=91&DLT_TE_ID=1707173901006678126`
    );
  }

  const salt = await bcryptjs.genSalt(10);
  const hashedOtp = await bcryptjs.hash(randomCode, salt);

  await Otp.updateOne(
    { phone: validate },
    {
      $set: {
        phone: validate,
        randomCode: hashedOtp,
        expiresAt: new Date(Date.now() + 5 * 60000),
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  res.status(200).json({
    message: "OTP sent successfully",
    success: true,
  });
};

export const verifyOtp = async (
  req: VerifyOtpRequest,
  res: Response<DefaultResponseBody>
) => {
  const { phone, code } = req.body;

  const isValidPhone = formatIndianPhoneNumber(phone);

  if (isValidPhone.ErrorCode !== 0) {
    res.status(400).json({
      message: isValidPhone.ErrorMessage,
      success: false,
    });
    return;
  }

  const validate = `91${formatIndianPhoneNumber(phone).cleanedPhone}`;

  if (!phone || !code) {
    res
      .status(400)
      .json({ message: "Phone and code are required", success: false });
    return;
  }

  const otpRecord = await Otp.findOne({ phone: validate });

  if (!otpRecord || !otpRecord.randomCode) {
    res
      .status(400)
      .json({ message: "OTP not found or expired", success: false });
    return;
  }

  const isMatch = await bcryptjs.compare(String(code), otpRecord.randomCode);

  if (!isMatch) {
    res.status(400).json({ message: "Invalid OTP", success: false });
    return;
  }

  if (otpRecord.expiresAt < new Date()) {
    res.status(400).json({ message: "OTP expired", success: false });
    return;
  }

  res.status(200).json({ message: "Verified", success: true });
};

export const register = async (
  req: RegisterRequest,
  res: Response<RegisterResponse>
) => {
  const data = req.body;

  const isValidPhone = formatIndianPhoneNumber(data.contact1);

  if (isValidPhone.ErrorCode !== 0) {
    res.status(400).json({
      message: isValidPhone.ErrorMessage,
      success: false,
    });
    return;
  }

  const validate = `91${formatIndianPhoneNumber(data.contact1).cleanedPhone}`;
  const existingUser = await User.findOne({ contact1: validate });

  if (existingUser) {
    res.status(400).json({ message: "User already exists", success: false });
    return;
  }

  const user = new User({
    ...req.body,
    contact1: validate,
  });

  try {
    await user.save();
    res.status(200).json({
      message: "User registered successfully",
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "User registration failed",
      success: false,
      error: error.errors || undefined,
    });
  }
};

export const login = async (
  req: LoginRequest,
  res: Response<LoginResponse>
) => {
  const { phone } = req.body;

  const isValidPhone = formatIndianPhoneNumber(phone);

  if (isValidPhone.ErrorCode !== 0) {
    res.status(400).json({
      message: isValidPhone.ErrorMessage,
      success: false,
    });
    return;
  }

  const validate = `91${formatIndianPhoneNumber(phone).cleanedPhone}`;

  console.log("Login attempt for:", validate);
  const user = await User.findOne({ contact1: validate });
  console.log("User", user);

  if (!user) {
    res.status(404).json({ message: "User not found", success: false });
    return;
  }

  res
    .status(200)
    .header(
      "Authorization",
      `Bearer ${jwt.sign({ userId: user._id }, JWT_SECRET)}`
    )
    .json({ message: "Login successful", success: true, data: user });
};
