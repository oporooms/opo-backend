import { getUser, getUserByCompanyId, updateSelfWallet, updateUsers } from "@/controllers/user";
import jwtAuthMiddleware from "@/middleware/session";
import { Router } from "express";

const userRouter = Router()

userRouter.get("/", jwtAuthMiddleware, getUser)
userRouter.get("/getUserByCompanyId", jwtAuthMiddleware, getUserByCompanyId)
userRouter.put("/", jwtAuthMiddleware, updateUsers)
userRouter.put("/updateSelfWallet", jwtAuthMiddleware, updateSelfWallet)

export default userRouter