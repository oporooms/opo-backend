import { createEnquiry, deleteEnquiry, getEnquiries, updateEnquiryStatus } from "@/controllers/Enquiry";
import { Router } from "express";

const enquiryRouter = Router()

enquiryRouter.get("/", getEnquiries)
enquiryRouter.post("/", createEnquiry)
enquiryRouter.put("/:id", updateEnquiryStatus)
enquiryRouter.delete("/:id", deleteEnquiry)

export default enquiryRouter;