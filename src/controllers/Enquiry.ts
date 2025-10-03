import Enquiry from "@/schemas/Enquiry";
import { DefaultResponseBody } from "@/types/default";
import { EnquiriesQuery, EnquiryStatus, IEnquiry } from "@/types/Enquiry";
import { Request, Response } from "express";

export const getEnquiries = async (
    req: Request<any, any, any, EnquiriesQuery>,
    res: Response<DefaultResponseBody<IEnquiry[]>>,
) => {
    const { status, email, phone, companyName, createdBefore, createdAfter, sortBy, sortOrder } = req.query;

    const filter: Record<string, any> = {};
    const sort: Record<string, 1 | -1> = { createdAt: -1 };

    if (status) filter.status = status;
    if (email) filter.email = email;
    if (phone) filter.phone = phone;
    if (companyName) filter.companyName = new RegExp(companyName, "i");
    if (createdBefore || createdAfter) filter.createdAt = {};
    if (createdBefore) filter.createdAt.$lte = new Date(createdBefore);
    if (createdAfter) filter.createdAt.$gte = new Date(createdAfter);
    if (sortBy) sort[sortBy] = sortOrder === 'asc' ? 1 : -1;


    try {
        const enquiries = await Enquiry.find(filter).sort(sort);

        res.status(200).json({
            data: enquiries,
            Status: { Code: 200, Message: "Enquiries fetched successfully." }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: { Code: 500, Message: "Unable to fetch enquiries." }
        });
    }

}

export const createEnquiry = async (
    req: Request<any, any, Partial<IEnquiry>>,
    res: Response<DefaultResponseBody<IEnquiry>>,
) => {
    const { fullname, email, companyName, phone, employees, gstDetails, message } = req.body;

    if (!fullname || !email || !companyName || !phone || !employees) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Missing required fields." }
        });
        return;
    }

    try {
        const newEnquiry = new Enquiry({
            fullname,
            email,
            companyName,
            phone,
            employees,
            gstDetails,
            message
        });

        await newEnquiry.save();
        res.status(201).json({
            data: newEnquiry,
            Status: { Code: 201, Message: "Enquiry created successfully." }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: { Code: 500, Message: "Unable to create enquiry." }
        });
    }
};

export const updateEnquiryStatus = async (
    req: Request<{ enquiryId: string }, any, { status: EnquiriesQuery['status'] }>,
    res: Response<DefaultResponseBody<IEnquiry>>,
) => {
    const { enquiryId } = req.params;
    const { status } = req.body;

    if (!enquiryId || !status || !Object.values(EnquiryStatus).includes(status)) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid enquiry ID or status." }
        });
        return;
    }

    try {
        const updatedEnquiry = await Enquiry.findByIdAndUpdate(enquiryId, { status }, { new: true });

        if (!updatedEnquiry) {
            res.status(404).json({
                data: null,
                Status: { Code: 404, Message: "Enquiry not found." }
            });
            return;
        }

        res.status(200).json({
            data: updatedEnquiry,
            Status: { Code: 200, Message: "Enquiry status updated successfully." }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: { Code: 500, Message: "Unable to update enquiry status." }
        });
    }
};

export const deleteEnquiry = async (
    req: Request<{ enquiryId: string }>,
    res: Response<DefaultResponseBody<null>>,
) => {
    const { enquiryId } = req.params;
    if (!enquiryId) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid enquiry ID." }
        });
        return;
    }

    try {
        const deletedEnquiry = await Enquiry.findByIdAndDelete(enquiryId);

        if (!deletedEnquiry) {
            res.status(404).json({
                data: null,
                Status: { Code: 404, Message: "Enquiry not found." }
            });
            return;
        }

        res.status(200).json({
            data: null,
            Status: { Code: 200, Message: "Enquiry deleted successfully." }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: { Code: 500, Message: "Unable to delete enquiry." }
        });
    }
};