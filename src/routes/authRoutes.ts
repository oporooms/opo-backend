import { Router } from "express";
import {
  register,
  login,
  sendOtp,
  sendMailOtp,
  loginWithMail,
} from "@/controllers/authController";
import { loginRateLimiter } from "@/middleware/rateLimit";

const router = Router();

router.post("/sendOtp", sendOtp);
router.post("/sendMailOtp", sendMailOtp);
router.post("/register", register);
router.post("/login", loginRateLimiter, login);
router.post("/loginWithMail", loginRateLimiter, loginWithMail);

export default router;
