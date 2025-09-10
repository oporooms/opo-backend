import { Router } from "express";
import {
  register,
  login,
  sendOtp,
} from "@/controllers/authController";
import { loginRateLimiter } from "@/middleware/rateLimit";

const router = Router();

router.post("/sendOtp", sendOtp);
router.post("/register", register);
router.post("/login", loginRateLimiter, login);

export default router;
