import { DefaultResponseBody } from "@/types/default";
import { HomestayStatus, IHomestay, SearchHomestay } from "@/types/homestay";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import Homestay from "@/schemas/Homestay/Homestay";
import User from "@/schemas/User";
import { UserRole } from "@/types/user";

export const createHomestay = async (
    req: Request<{}, {}, Partial<IHomestay>>,
    res: Response<DefaultResponseBody<IHomestay>>
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ data: null, Status: { Code: 401, Message: "Unauthorized" } });
            return;
        }

        const user = await User.findById(userId);
        if (!user || (user.userRole !== UserRole.HotelOwner && user.userRole !== UserRole.SADMIN)) {
            res.status(403).json({ data: null, Status: { Code: 403, Message: "You do not have permission to create homestay." } });
            return;
        }

        const userObjectId = user._id instanceof Types.ObjectId
            ? user._id
            : new Types.ObjectId(String(user._id));

        const payload: Partial<IHomestay> = {
            ...req.body,
            homestayOwnerId: req.body.homestayOwnerId || userObjectId,
            status: req.body.status || HomestayStatus.PENDING,
            photos: Array.isArray(req.body.photos) ? req.body.photos : [],
            amenities: Array.isArray(req.body.amenities) ? req.body.amenities : [],
            rules: Array.isArray(req.body.rules) ? req.body.rules : [],
            views: Array.isArray(req.body.views) ? req.body.views : [],
            units: Array.isArray(req.body.units) ? req.body.units.map(unit => ({
                ...unit,
                maxAdults: Number(unit?.maxAdults || 2),
                maxChildren: Number(unit?.maxChildren || 1)
            })) : []
        };

        if (!payload.name || !payload.customAddress || !payload.desc || !payload.address || !payload.units?.length) {
            res.status(400).json({ data: null, Status: { Code: 400, Message: "name, customAddress, desc, address and units are required" } });
            return;
        }

        const homestay = new Homestay(payload);
        await homestay.save();
        res.status(201).json({ data: homestay.toObject() as IHomestay, Status: { Code: 201, Message: "Homestay created successfully" } });
    } catch (error) {
        res.status(400).json({ data: null, Status: { Code: 400, Message: (error as Error).message } });
    }
};

export const getAllHomestays = async (
    req: Request<{}, any, any, SearchHomestay>,
    res: Response<DefaultResponseBody<IHomestay[]>>
) => {
    try {
        const { homestayOwnerId, name, city, locality, lat, lng, minPrice, maxPrice, amenities, skip = '0', limit = '20' } = req.query;
        const filters: Record<string, unknown> = {};

        if (homestayOwnerId && Types.ObjectId.isValid(homestayOwnerId)) {
            filters.homestayOwnerId = new Types.ObjectId(homestayOwnerId);
        }
        if (name) filters.name = new RegExp(name, "i");
        if (city) filters["address.City"] = new RegExp(city, "i");
        if (locality) filters["address.Locality"] = new RegExp(locality, "i");
        if (amenities) filters.amenities = { $all: amenities.split(',').map(item => item.trim()) };
        if (minPrice || maxPrice) {
            filters["units.price"] = {
                ...(minPrice ? { $gte: Number(minPrice) } : {}),
                ...(maxPrice ? { $lte: Number(maxPrice) } : {})
            };
        }

        let query = Homestay.find(filters).sort({ _id: -1 });

        if (lat && lng) {
            query = Homestay.find({
                ...filters,
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [Number(lng), Number(lat)]
                        },
                        $maxDistance: 20000
                    }
                }
            });
        }

        const data = await query.skip(Number(skip)).limit(Number(limit));

        res.status(200).json({ data: data as unknown as IHomestay[], Status: { Code: 200, Message: "Homestays fetched successfully" } });
    } catch (error) {
        res.status(500).json({ data: null, Status: { Code: 500, Message: (error as Error).message } });
    }
};

export const getSingleHomestay = async (
    req: Request<{ slug: string }>,
    res: Response<DefaultResponseBody<IHomestay>>
) => {
    try {
        const { slug } = req.params;
        const cleanedSlug = slug.trim();

        const byId = Types.ObjectId.isValid(cleanedSlug) ? await Homestay.findById(cleanedSlug) : null;
        if (byId) {
            res.status(200).json({ data: byId.toObject() as IHomestay, Status: { Code: 200, Message: "Homestay found" } });
            return;
        }

        const byUid = await Homestay.findOne({ homestayUId: Number(cleanedSlug.replace(/\D/g, '')) || -1 });
        if (byUid) {
            res.status(200).json({ data: byUid.toObject() as IHomestay, Status: { Code: 200, Message: "Homestay found" } });
            return;
        }

        const byNameSlug = await Homestay.findOne({
            name: new RegExp(`^${cleanedSlug.replace(/[-_]+/g, ' ').replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, 'i')
        });

        if (!byNameSlug) {
            res.status(404).json({ data: null, Status: { Code: 404, Message: "Homestay not found" } });
            return;
        }

        res.status(200).json({ data: byNameSlug.toObject() as IHomestay, Status: { Code: 200, Message: "Homestay found" } });
    } catch (error) {
        res.status(500).json({ data: null, Status: { Code: 500, Message: (error as Error).message } });
    }
};

export const updateHomestay = async (
    req: Request<{ _id: string }, {}, Partial<IHomestay>>,
    res: Response<DefaultResponseBody<IHomestay>>
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ data: null, Status: { Code: 401, Message: "Unauthorized" } });
            return;
        }

        const user = await User.findById(userId);
        const homestay = await Homestay.findById(req.params._id);

        if (!homestay) {
            res.status(404).json({ data: null, Status: { Code: 404, Message: "Homestay not found" } });
            return;
        }

        const isOwner = String(homestay.homestayOwnerId) === String(userId);
        const isSAdmin = user?.userRole === UserRole.SADMIN;

        if (!isOwner && !isSAdmin) {
            res.status(403).json({ data: null, Status: { Code: 403, Message: "You do not have permission to update this homestay." } });
            return;
        }

        const updated = await Homestay.findByIdAndUpdate(
            req.params._id,
            {
                ...req.body,
                units: Array.isArray(req.body.units) ? req.body.units.map(unit => ({
                    ...unit,
                    maxAdults: Number(unit?.maxAdults || 2),
                    maxChildren: Number(unit?.maxChildren || 1)
                })) : req.body.units,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!updated) {
            res.status(404).json({ data: null, Status: { Code: 404, Message: "Homestay not found" } });
            return;
        }

        res.status(200).json({ data: updated.toObject() as IHomestay, Status: { Code: 200, Message: "Homestay updated successfully" } });
    } catch (error) {
        res.status(400).json({ data: null, Status: { Code: 400, Message: (error as Error).message } });
    }
};

export const deleteHomestay = async (
    req: Request<{ _id: string }>,
    res: Response<DefaultResponseBody<null>>
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ data: null, Status: { Code: 401, Message: "Unauthorized" } });
            return;
        }

        const user = await User.findById(userId);
        const homestay = await Homestay.findById(req.params._id);

        if (!homestay) {
            res.status(404).json({ data: null, Status: { Code: 404, Message: "Homestay not found" } });
            return;
        }

        const isOwner = String(homestay.homestayOwnerId) === String(userId);
        const isSAdmin = user?.userRole === UserRole.SADMIN;

        if (!isOwner && !isSAdmin) {
            res.status(403).json({ data: null, Status: { Code: 403, Message: "You do not have permission to delete this homestay." } });
            return;
        }

        await Homestay.findByIdAndDelete(req.params._id);
        res.status(200).json({ data: null, Status: { Code: 200, Message: "Homestay deleted successfully" } });
    } catch (error) {
        res.status(500).json({ data: null, Status: { Code: 500, Message: (error as Error).message } });
    }
};

export const deleteMultipleHomestays = async (
    req: Request<{}, {}, { ids: string[] }>,
    res: Response<DefaultResponseBody<null>>
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ data: null, Status: { Code: 401, Message: "Unauthorized" } });
            return;
        }

        if (!Array.isArray(req.body.ids) || req.body.ids.length === 0) {
            res.status(400).json({ data: null, Status: { Code: 400, Message: "ids array is required" } });
            return;
        }

        const user = await User.findById(userId);
        const isSAdmin = user?.userRole === UserRole.SADMIN;
        const objectIds = req.body.ids.filter(Types.ObjectId.isValid).map(id => new Types.ObjectId(id));

        if (!objectIds.length) {
            res.status(400).json({ data: null, Status: { Code: 400, Message: "No valid homestay ids provided" } });
            return;
        }

        const baseFilter: Record<string, unknown> = { _id: { $in: objectIds } };
        if (!isSAdmin) {
            baseFilter.homestayOwnerId = new Types.ObjectId(userId);
        }

        await Homestay.deleteMany(baseFilter);
        res.status(200).json({ data: null, Status: { Code: 200, Message: "Homestays deleted successfully" } });
    } catch (error) {
        res.status(500).json({ data: null, Status: { Code: 500, Message: (error as Error).message } });
    }
};
