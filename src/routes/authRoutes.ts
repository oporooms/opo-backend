import { Router } from "express";
import {
  register,
  login,
  sendOtp,
  verifyOtp,
} from "@/controllers/authController";

const router = Router();

router.post("/sendOtp", sendOtp);
router.post("/verifyOtp", verifyOtp);
router.post("/register", register);
router.post("/login", login);

export default router;
