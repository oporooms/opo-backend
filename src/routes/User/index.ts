import { getUser } from "@/controllers/user";
import { Router } from "express";

const userRouter = Router()

userRouter.get("/", getUser)

export default userRouter