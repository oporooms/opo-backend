import { getUser, updateUsers } from "@/controllers/user";
import jwtAuthMiddleware from "@/middleware/session";
import { Router } from "express";

const userRouter = Router()

userRouter.get("/", getUser)
userRouter.put("/", updateUsers)

export default userRouter