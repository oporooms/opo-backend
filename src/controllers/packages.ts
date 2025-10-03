import Package from "@/schemas/Package";
import { DefaultResponseBody } from "@/types/default";
import { Package as PackageType, PackageRequestQuery, PackageStatus } from "@/types/Package";
import { Request, Response } from "express";

export const getPackages = async (
    req: Request<any, any, any, PackageRequestQuery>,
    res: Response<DefaultResponseBody<PackageType[]>>
) => {
    const { category, status, isFeatured, city, minPrice, maxPrice, durationFrom, durationTo, page, limit } = req.query;

    const filter: Record<string, any> = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (isFeatured !== undefined) filter.isFeatured = isFeatured === true;
    if (city) filter.city = city;
    if (minPrice) filter['price.sale'] = { ...filter['price.sale'], $gte: Number(minPrice) };
    if (maxPrice) filter['price.sale'] = { ...filter['price.sale'], $lte: Number(maxPrice) };

    if (durationFrom || durationTo) {
        filter.duration = {};
        if (durationFrom) {
            const fromDate = new Date(durationFrom);
            if (Number.isNaN(fromDate.valueOf())) {
                res.status(400).json({
                    data: null,
                    Status: {
                        Code: 400, Message: "Invalid 'durationFrom' date supplied."
                    }
                });
                return;
            }
            filter.duration.$gte = fromDate;
        }
        if (durationTo) {
            const toDate = new Date(durationTo);
            if (Number.isNaN(toDate.valueOf())) {
                res.status(400).json({
                    data: null,
                    Status: {
                        Code: 400, Message: "Invalid 'durationTo' date supplied."
                    }
                });
                return;
            }
            filter.duration.$lte = toDate;
        }
    }

    const pageNumber = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNumber = limit ? Math.max(1, parseInt(limit, 10)) : 20;
    const skip = (pageNumber - 1) * limitNumber;


    const data = await Package.find({
        ...filter,
        status: PackageStatus.ACTIVE
    })
        .skip(skip)
        .limit(limitNumber)
        .lean();

    console.log("Filter applied:", filter);
    console.log("data", data);

    if (!data) {
        res.status(404).json({
            data: null,
            Status: { Code: 404, Message: "No packages found." }
        });
        return;
    }

    res.status(200).json({
        data,
        Status: { Code: 200, Message: "Packages fetched successfully." }
    });
}

export const createPackage = async (
    req: Request<any, any, PackageType>,
    res: Response<DefaultResponseBody<PackageType>>
) => {

    // validate required fields
    const {
        title,
        description,
        images,
        price,
        duration,
        category,
        city,
        status,
        isFeatured,
        maxRooms,
        flightAvailable,
        hotelAvailable,
        createdAt,
        updatedAt
    } = req.body;

    if (!title || typeof title !== "string") {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'title'." }
        });
        return;
    }

    if (!description || typeof description !== "string") {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'description'." }
        });
        return;
    }

    if (!Array.isArray(images) || images.length === 0 || !images.every(i => typeof i === "string")) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'images'. Expect non-empty string array." }
        });
        return;
    }

    if (!price || typeof price !== "object") {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'price' object." }
        });
        return;
    } else {
        const sale = Number(price.sale);
        const regular = Number(price.regular);
        if (!Number.isFinite(sale) || sale < 0) {
            res.status(400).json({
                data: null,
                Status: { Code: 400, Message: "Invalid 'price.sale'. Must be a non-negative number." }
            });
            return;
        }
        if (!Number.isFinite(regular) || regular < 0) {
            res.status(400).json({
                data: null,
                Status: { Code: 400, Message: "Invalid 'price.regular'. Must be a non-negative number." }
            });
            return;
        }
        req.body.price = { sale, regular };
    }

    const parsedDuration = new Date(duration);
    if (!duration || Number.isNaN(parsedDuration.valueOf())) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'duration'. Expect a valid date." }
        });
        return;
    } else {
        req.body.duration = parsedDuration;
    }

    if (!category || typeof category !== "string") {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'category'." }
        });
        return;
    }

    if (!city || typeof city !== "string") {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'city'." }
        });
        return;
    }

    if (!status || typeof status !== "string") {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'status'." }
        });
        return;
    }

    if (typeof isFeatured !== "boolean") {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'isFeatured'. Must be boolean." }
        });
        return;
    }

    const mr = Number(maxRooms);
    if (!Number.isInteger(mr) || mr <= 0) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'maxRooms'. Must be a positive integer." }
        });
        return;
    } else {
        req.body.maxRooms = mr;
    }

    if (flightAvailable !== undefined && typeof flightAvailable !== "boolean") {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'flightAvailable'. If provided, must be boolean." }
        });
        return;
    }

    if (hotelAvailable !== undefined && typeof hotelAvailable !== "boolean") {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'hotelAvailable'. If provided, must be boolean." }
        });
        return;
    }

    const parsedCreatedAt = createdAt ? new Date(createdAt) : new Date();
    if (createdAt && Number.isNaN(parsedCreatedAt.valueOf())) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'createdAt'. Expect a valid date." }
        });
        return;
    } else {
        req.body.createdAt = parsedCreatedAt;
    }

    const parsedUpdatedAt = updatedAt ? new Date(updatedAt) : new Date();
    if (updatedAt && Number.isNaN(parsedUpdatedAt.valueOf())) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "Invalid 'updatedAt'. Expect a valid date." }
        });
        return;
    } else {
        req.body.updatedAt = parsedUpdatedAt;
    }

    const newPackage = new Package(req.body);
    await newPackage.save();

    res.status(201).json({
        data: newPackage,
        Status: { Code: 201, Message: "Package created successfully." }
    });
};

export const updatePackage = async (
    req: Request<{ id: string }, any, Partial<PackageType>>,
    res: Response<DefaultResponseBody<PackageType>>
) => {
    const { id } = req.params;
    const updatedPackage = await Package.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedPackage) {
        res.status(404).json({
            data: null,
            Status: { Code: 404, Message: "Package not found." }
        });
        return;
    }

    res.status(200).json({
        data: updatedPackage,
        Status: { Code: 200, Message: "Package updated successfully." }
    });
};
