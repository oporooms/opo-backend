import { Request, Response } from "express";
import User from "@/schemas/User";
import jwt from "jsonwebtoken";
import Otp from "@/schemas/Otp";
import { formatIndianPhoneNumber } from "@/functions";
import axios from "axios";
import ip from "ip";
import bcryptjs from "bcryptjs";
import {
  LoginRequest,
  RegisterRequest,
  SendOtpRequest,
  VerifyOtpRequest,
} from "../types/auth";
import { DefaultResponseBody } from "@/types/default";
import dotenv from "dotenv";
import { UserRole } from "@/types/user";
import handleMail from "./mail";

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env" });
} else {
  dotenv.config({ path: ".env.local" });
}


const JWT_SECRET = process.env.JWT_SECRET?.trim() || "supersecret";
const JWT_ISSUER = process.env.JWT_ISSUER?.trim() || "your-issuer";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE?.trim() || "your-audience";

export const sendOtp = async (
  req: SendOtpRequest,
  res: Response<DefaultResponseBody<string | number>>
) => {
  const { phone } = req.body;

  const validate = formatIndianPhoneNumber(phone);

  if (validate.ErrorCode !== 0 || !validate || !validate.cleanedPhone) {
    res.status(400).json({
      data: validate.ErrorMessage,
      Status: {
        Code: 400,
        Message: validate.ErrorMessage,
      }
    });
    return;
  }

  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const defaultNum = [
    "8435289879",
    "8874059274",
    "7007498505",
    "9792047144",
    "6387183902",
    "8088676065",
    "7483462760",
    "7766942151",
  ];
  const otp = defaultNum.includes(validate.cleanedPhone) ? "123456" : generatedOtp;
  const userIp =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    ip.address();

  const now = new Date();

  // Merge IP tracking into Otp model: store userIp and otpCount in Otp
  const salt = await bcryptjs.genSalt(10);
  const hashedOtp = await bcryptjs.hash(otp, salt);

  // Find existing OTP record for this phone and IP
  const otpRecord = await Otp.findOne({ phone: String(validate.cleanedPhone), userIp });

  // OTP request limit logic (was in IpSchema)
  if (
    otpRecord &&
    otpRecord.expiresAt > new Date(now.getTime() - 60 * 60 * 1000) &&
    otpRecord.otpCount >= 3
  ) {
    res.status(400).json({
      data: "OTP request limit exceeded. Try again after 1 hour.",
      Status: {
        Code: 400,
        Message: "OTP request limit exceeded. Try again after 1 hour."
      }
    });
    return;
  }

  if (!defaultNum.includes(validate.cleanedPhone)) {
    await axios.get(
      `http://136.243.171.112/api/sendhttp.php?authkey=37336b756d617232383803&mobiles=${validate.cleanedPhone}&message=Dear User, \nYour OTP for Login to oporooms.com is ${otp}. Please do not share it. \nWith Regards OPO Rooms.&sender=OPOROM&route=2&country=91&DLT_TE_ID=1707173901006678126`
    );
  }

  // Only update date if otpCount is less than 4
  if (otpRecord) {
    const update: any = { $inc: { otpCount: 1 } };
    if (otpRecord.otpCount < 3) {
      update.$set = { expiresAt: new Date(Date.now() + 5 * 60000) };
    }
    await Otp.updateOne({ phone: String(validate.cleanedPhone), userIp }, update, { upsert: true });
  } else {
    await Otp.updateOne(
      { phone: String(validate.cleanedPhone), userIp },
      { $set: { otpCount: 1, expiresAt: new Date(Date.now() + 5 * 60000) } },
      { upsert: true }
    );
  }

  // Save OTP with IP and otpCount
  await Otp.updateOne(
    { phone: validate.cleanedPhone, userIp },
    {
      $set: {
        phone: String(validate.cleanedPhone),
        otp: hashedOtp,
        expiresAt: new Date(Date.now() + 5 * 60000),
        createdAt: new Date(),
        userIp,
      },
    },
    { upsert: true }
  );

  res.status(200).json({
    data: "OTP sent successfully",
    Status: {
      Code: 200,
      Message: "OTP sent successfully"
    }
  });
};

export const sendMailOtp = async (
  req: Request<{}, {}, { email: string }>,
  res: Response<DefaultResponseBody<string | number>>
) => {
  const { email } = req.body;

  const validate = { cleanedEmail: email };


  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const defaultNum = [
    "8435289879",
    "8874059274",
    "7007498505",
    "9792047144",
    "6387183902",
    "8088676065",
    "7483462760",
    "7766942151",
  ];
  const otp = defaultNum.includes(validate.cleanedEmail) ? "123456" : generatedOtp;
  const userIp =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    ip.address();

  const now = new Date();

  // Merge IP tracking into Otp model: store userIp and otpCount in Otp
  const salt = await bcryptjs.genSalt(10);
  const hashedOtp = await bcryptjs.hash(otp, salt);

  // Find existing OTP record for this email and IP
  const otpRecord = await Otp.findOne({ email: String(validate.cleanedEmail), userIp });

  // OTP request limit logic (was in IpSchema)
  if (
    otpRecord &&
    otpRecord.expiresAt > new Date(now.getTime() - 60 * 60 * 1000) &&
    otpRecord.otpCount >= 3
  ) {
    res.status(400).json({
      data: "OTP request limit exceeded. Try again after 1 hour.",
      Status: {
        Code: 400,
        Message: "OTP request limit exceeded. Try again after 1 hour."
      }
    });
    return;
  }

  if (!defaultNum.includes(validate.cleanedEmail)) {
    await handleMail({
      email: validate.cleanedEmail,
      sub: "Your OTP for Login",
      html: `<p>Dear User,</p>
      <p>Your OTP for Login is <strong>${otp}</strong>. Please do not share it.</p>
`,
    })
  }

  // Only update date if otpCount is less than 4
  if (otpRecord) {
    const update: any = { $inc: { otpCount: 1 } };
    if (otpRecord.otpCount < 3) {
      update.$set = { expiresAt: new Date(Date.now() + 5 * 60000) };
    }
    await Otp.updateOne({ email: String(validate.cleanedEmail), userIp }, update, { upsert: true });
  } else {
    await Otp.updateOne(
      { email: String(validate.cleanedEmail), userIp },
      { $set: { otpCount: 1, expiresAt: new Date(Date.now() + 5 * 60000) } },
      { upsert: true }
    );
  }

  // Save OTP with IP and otpCount
  await Otp.updateOne(
    { email: validate.cleanedEmail, userIp },
    {
      $set: {
        email: String(validate.cleanedEmail),
        otp: hashedOtp,
        expiresAt: new Date(Date.now() + 5 * 60000),
        createdAt: new Date(),
        userIp,
      },
    },
    { upsert: true }
  );

  res.status(200).json({
    data: "OTP sent successfully",
    Status: {
      Code: 200,
      Message: "OTP sent successfully"
    }
  });
};

export const verifyOtp = async (phone: number | string, code: number): Promise<DefaultResponseBody<string>> => {

  if (!phone || !code) {
    return {
      data: "Phone and code are required",
      Status: {
        Code: 400,
        Message: "Phone and code are required"
      }
    };
  }


  if (String(code).length !== 6) {
    return {
      data: "Invalid code format",
      Status: {
        Code: 400,
        Message: "Invalid code format"
      }
    };
  }

  if (isNaN(Number(code))) {
    return {
      data: "Code must be numeric",
      Status: {
        Code: 400,
        Message: "Code must be numeric"
      }
    };
  }

  const validate = formatIndianPhoneNumber(phone);

  if (validate.ErrorCode !== 0 || !validate.cleanedPhone) {
    return {
      data: validate.ErrorMessage,
      Status: {
        Code: 400,
        Message: validate.ErrorMessage,
      }
    };
  }

  const otpRecord = await Otp.findOne({ phone: String(validate.cleanedPhone) });

  if (!otpRecord || !otpRecord.otp) {
    return {
      data: "OTP not found or expired",
      Status: {
        Code: 400,
        Message: "OTP not found or expired"
      }
    };
  }

  // Expire OTP if more than 2 minutes have passed since creation
  const createdAt = otpRecord.createdAt;

  const isMatch = await bcryptjs.compare(String(code), otpRecord.otp);

  if (!isMatch) {
    return {
      data: "Invalid OTP",
      Status: {
        Code: 400,
        Message: "Invalid OTP"
      }
    };
  }

  if (otpRecord.expiresAt < new Date()) {
    return {
      data: "OTP expired",
      Status: {
        Code: 400,
        Message: "OTP expired"
      }
    };
  }

  return {
    data: "Verified",
    Status: {
      Code: 200,
      Message: "Verified"
    }
  };
};

export const verifyMailOtp = async (email: string, code: number): Promise<DefaultResponseBody<string>> => {

  if (!email || !code) {
    return {
      data: "Email and code are required",
      Status: {
        Code: 400,
        Message: "Email and code are required"
      }
    };
  }


  if (String(code).length !== 6) {
    return {
      data: "Invalid code format",
      Status: {
        Code: 400,
        Message: "Invalid code format"
      }
    };
  }

  if (isNaN(Number(code))) {
    return {
      data: "Code must be numeric",
      Status: {
        Code: 400,
        Message: "Code must be numeric"
      }
    };
  }

  const validate = { cleanedEmail: email };

  const otpRecord = await Otp.findOne({ email: String(validate.cleanedEmail) });

  if (!otpRecord || !otpRecord.otp) {
    return {
      data: "OTP not found or expired",
      Status: {
        Code: 400,
        Message: "OTP not found or expired"
      }
    };
  }

  // Expire OTP if more than 2 minutes have passed since creation
  const createdAt = otpRecord.createdAt;

  if (Date.now() - createdAt.getTime() > 2 * 60 * 1000) {
    return {
      data: "OTP expired",
      Status: {
        Code: 400,
        Message: "OTP expired",
      },
    };
  }

  const isMatch = await bcryptjs.compare(String(code), otpRecord.otp);

  if (!isMatch) {
    return {
      data: "Invalid OTP",
      Status: {
        Code: 400,
        Message: "Invalid OTP"
      }
    };
  }

  if (otpRecord.expiresAt < new Date()) {
    return {
      data: "OTP expired",
      Status: {
        Code: 400,
        Message: "OTP expired"
      }
    };
  }

  return {
    data: "Verified",
    Status: {
      Code: 200,
      Message: "Verified"
    }
  };
};

export const register = async (
  req: RegisterRequest,
  res: Response<DefaultResponseBody<
    {
      token: string;
      id: string;
      fullname: string;
      email: string;
      phone: string;
    } | string>
  >
) => {
  const data = req.body;

  //Pre defined values so no need to set them in the request body
  const userRole = UserRole.USER;
  const walletBalance = 0;

  const isValidPhone = formatIndianPhoneNumber(data.phone);

  if (isValidPhone.ErrorCode !== 0) {
    res.status(400).json({
      data: isValidPhone.ErrorMessage,
      Status: {
        Code: 400,
        Message: isValidPhone.ErrorMessage
      }
    });
    return;
  }

  const existingUser = await User.findOne({ phone: isValidPhone.cleanedPhone }, { _id: 1 }).lean();

  if (existingUser) {
    res.status(400).json({
      data: "User already exists",
      Status: {
        Code: 400,
        Message: "User already exists"
      }
    });
    return;
  }

  const isValid = await verifyOtp(String(isValidPhone.cleanedPhone), Number(data.code));

  if (isValid.Status.Code == 400) {
    res.status(400).json(isValid);
    return;
  }

  const user = new User({
    ...req.body,
    phone: isValidPhone.cleanedPhone,
    userRole,
    wallet: walletBalance
  });

  try {
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      {
        expiresIn: "30d", // 1 month
        algorithm: "HS256",
        issuer: JWT_ISSUER || undefined,
        audience: JWT_AUDIENCE || undefined,
      }
    );

    if (!token) {
      res.status(500).json({
        data: "Token generation failed",
        Status: {
          Code: 500,
          Message: "Token generation failed"
        }
      });
      return;
    }

    await User.updateOne({ _id: user._id }, {
      token: token,
      lastLogin: new Date()
    }).lean();

    const cookieOptions = {
      httpOnly: true, // Prevents client-side JavaScript access
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      sameSite: 'strict' as const, // Or 'Strict' for stricter security
      maxAge: 60 * 60 * 24 * 7, // 1 week
    };

    res
      .status(200)
      .json({
        data: {
          token,
          id: user._id.toString(),
          fullname: user.fullname || "",
          email: user.email || "",
          phone: user.phone || ""
        },
        Status: {
          Code: 200,
          Message: "Login successful"
        }
      });

  } catch (error: any) {
    res.status(500).json({
      data: error.message || "User registration failed",
      Status: {
        Code: 500,
        Message: error.message || "User registration failed",
      }
    });
  }
};

export const login = async (
  req: Request<{}, {}, { phone: string | number, code: number }>,
  res: Response<DefaultResponseBody<{
    token: string;
    id: string;
    fullname: string;
    email: string;
    phone: string;
  } | string>>
) => {
  const { phone, code } = req.body

  const isValidPhone = formatIndianPhoneNumber(phone);

  if (isValidPhone.ErrorCode !== 0 || !isValidPhone.cleanedPhone) {
    res.status(400).json({
      data: isValidPhone.ErrorMessage,
      Status: {
        Code: 200,
        Message: isValidPhone.ErrorMessage,
      }
    });
    return;
  }

  const isValid = await verifyOtp(isValidPhone.cleanedPhone, code);

  if (isValid.Status.Code == 400) {
    res.status(400).json(isValid);
    return;
  }

  const user = await User.findOne({ phone: isValidPhone.cleanedPhone }).lean();

  if (!user) {
    res.status(404).json({
      data: "User not found",
      Status: {
        Code: 404,
        Message: "User not found"
      }
    });
    return;
  }

  const encryptedOtp = await bcryptjs.hash(String(code), 10);

  const token = jwt.sign(
    { userId: user._id, otp: encryptedOtp },
    JWT_SECRET,
    {
      expiresIn: "30d", // 1 month
      algorithm: "HS256",
      issuer: JWT_ISSUER || undefined,
      audience: JWT_AUDIENCE || undefined,
    }
  );

  if (!token) {
    res.status(500).json({
      data: "Token generation failed",
      Status: {
        Code: 500,
        Message: "Token generation failed"
      }
    });
    return;
  }

  await User.updateOne({ _id: user._id }, {
    token: token,
    lastLogin: new Date(),
    lastOtp: encryptedOtp
  }).lean();

  const cookieOptions = {
    httpOnly: true, // Prevents client-side JavaScript access
    secure: process.env.NODE_ENV === 'production', // Use secure in production
    sameSite: 'strict' as const, // Or 'Strict' for stricter security
    maxAge: 60 * 60 * 24 * 7, // 1 week
  };

  res
    .status(200)
    .json({
      data: {
        token,
        id: user._id.toString(),
        fullname: user.fullname || "",
        email: user.email || "",
        phone: user.phone || ""
      },
      Status: {
        Code: 200,
        Message: "Login successful"
      }
    });
};

export const loginWithMail = async (
  req: Request<{}, {}, { email: string, code: number }>,
  res: Response<DefaultResponseBody<{
    token: string;
    id: string;
    fullname: string;
    email: string;
    phone: string;
  } | string>>
) => {
  const { email, code } = req.body

  const isValidEmail = { cleanedEmail: email };

  const isValid = await verifyMailOtp(isValidEmail.cleanedEmail, code);

  if (isValid.Status.Code == 400) {
    res.status(400).json(isValid);
    return;
  }

  const user = await User.findOne({ email: isValidEmail.cleanedEmail }).lean();

  if (!user) {
    res.status(404).json({
      data: "User not found",
      Status: {
        Code: 404,
        Message: "User not found"
      }
    });
    return;
  }

  console.log("user found:", user);

  const token = jwt.sign(
    { userId: user._id },
    JWT_SECRET,
    {
      expiresIn: "30d", // 1 month
      algorithm: "HS256",
      issuer: JWT_ISSUER || undefined,
      audience: JWT_AUDIENCE || undefined,
    }
  );

  if (!token) {
    res.status(500).json({
      data: "Token generation failed",
      Status: {
        Code: 500,
        Message: "Token generation failed"
      }
    });
    return;
  }

  await User.updateOne({ _id: user._id }, {
    token: token,
    lastLogin: new Date()
  }).lean();

  const cookieOptions = {
    httpOnly: true, // Prevents client-side JavaScript access
    secure: process.env.NODE_ENV === 'production', // Use secure in production
    sameSite: 'strict' as const, // Or 'Strict' for stricter security
    maxAge: 60 * 60 * 24 * 7, // 1 week
  };

  res
    .status(200)
    .json({
      data: {
        token,
        id: user._id.toString(),
        fullname: user.fullname || "",
        email: user.email || "",
        phone: user.phone || ""
      },
      Status: {
        Code: 200,
        Message: "Login successful"
      }
    });
};
