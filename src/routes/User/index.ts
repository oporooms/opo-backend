import { createUser, getHotelOwners, getUser, getUserByCompanyId, updateSelfWallet, updateUsers } from "@/controllers/user";
import { Router } from "express";

const userRouter = Router()

userRouter.get("/", getUser)
userRouter.post("/", createUser)
userRouter.get("/getUserByCompanyId", getUserByCompanyId)
userRouter.get("/hotelOwners", getHotelOwners)
userRouter.put("/", updateUsers)
userRouter.put("/updateSelfWallet", updateSelfWallet)

export default userRouter