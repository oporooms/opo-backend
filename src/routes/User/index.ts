import { createUser, getUser, getUserByCompanyId, updateSelfWallet, updateUsers } from "@/controllers/user";
import { Router } from "express";

const userRouter = Router()

userRouter.get("/", getUser)
userRouter.post("/", createUser)
userRouter.get("/getUserByCompanyId", getUserByCompanyId)
userRouter.put("/", updateUsers)
userRouter.put("/updateSelfWallet", updateSelfWallet)

export default userRouter