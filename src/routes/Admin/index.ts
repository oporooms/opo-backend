import { dashboardHandler } from "@/controllers/Admin";
import jwtAuthMiddleware from "@/middleware/session";
import { Router } from "express";

const adminRouter = Router()

adminRouter.get('/dashboard', jwtAuthMiddleware, dashboardHandler);

export default adminRouter;