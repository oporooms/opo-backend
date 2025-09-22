import { getUser } from "@/controllers/user";
import jwtAuthMiddleware from "@/middleware/session";
import { Router } from "express";

const userRouter = Router()

userRouter.get("/", jwtAuthMiddleware, getUser)

export default userRouter