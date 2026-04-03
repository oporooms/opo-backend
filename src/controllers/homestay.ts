import { DefaultResponseBody } from "@/types/default";
import { HomestayStatus, IHomestay, SearchHomestay } from "@/types/homestay";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import Homestay from "@/schemas/Homestay/Homestay";
import Booking from "@/schemas/Booking";
import User from "@/schemas/User";
import dayjs from "dayjs";
import { BookingStatus, BookingType } from "@/types/Bookings";
import { UserRole } from "@/types/user";
import { removeNoSqlInjection } from "@/functions";

interface HomestayCitySuggestion {
    cityId: string;
    city: string;
    state: string;
    stateCode: string;
    country: string;
    countryCode: string;
}

const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeCityInput = (input: string): string =>
    String(input || "").trim().replace(/\s+/g, " ");

const buildCityRegexFilters = (input: string): Record<string, RegExp>[] => {
    const normalized = normalizeCityInput(input);
    if (!normalized) {
        return [];
    }

    const primaryToken = normalized.split(',')[0]?.trim() || normalized;
    const lettersOnly = primaryToken.replace(/[^a-zA-Z]/g, '');

    const fullRegex = new RegExp(escapeRegex(normalized), 'i');
    const primaryRegex = primaryToken !== normalized
        ? new RegExp(escapeRegex(primaryToken), 'i')
        : null;
    const prefixRegex = lettersOnly.length >= 3
        ? new RegExp(`^${escapeRegex(lettersOnly.slice(0, 3))}`, 'i')
        : null;

    const fields = ["address.City", "address.Locality", "customAddress"] as const;
    const filters: Record<string, RegExp>[] = [];

    for (const field of fields) {
        filters.push({ [field]: fullRegex });

        if (primaryRegex) {
            filters.push({ [field]: primaryRegex });
        }

        if (prefixRegex) {
            filters.push({ [field]: prefixRegex });
        }
    }

    return filters;
};

const parseAddressParts = (input: string): string[] =>
    String(input || '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

const buildCitySuggestionScore = (query: string, suggestion: HomestayCitySuggestion): number => {
    const q = query.toLowerCase();
    const city = suggestion.city.toLowerCase();
    const state = suggestion.state.toLowerCase();
    const country = suggestion.country.toLowerCase();

    if (city === q) return 4;
    if (city.startsWith(q)) return 3;
    if (city.includes(q)) return 2;
    if (`${state} ${country}`.includes(q)) return 1;
    return 0;
};

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

export const searchHomestayCity = async (
    req: Request<{}, any, any, { city_name?: string }> ,
    res: Response<DefaultResponseBody<HomestayCitySuggestion[]>>
) => {
    const cleanedInput = removeNoSqlInjection(String(req.query.city_name || ''));
    const query = normalizeCityInput(cleanedInput);

    if (!query) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "City name is required" }
        });
        return;
    }

    if (!/^\d+$/.test(query) && query.length < 3) {
        res.status(400).json({
            data: null,
            Status: { Code: 400, Message: "City name must be at least 3 characters" }
        });
        return;
    }

    try {
        const cityFilters = buildCityRegexFilters(query);

        const matchedHomestays = await Homestay.find({
            ...(cityFilters.length ? { $or: cityFilters } : {})
        })
            .select('address customAddress')
            .limit(100)
            .lean();

        if (!matchedHomestays.length) {
            res.status(404).json({
                data: null,
                Status: { Code: 404, Message: "No results found" }
            });
            return;
        }

        const cityMap = new Map<string, HomestayCitySuggestion>();

        for (const homestay of matchedHomestays) {
            const addressParts = parseAddressParts(homestay.customAddress || '');
            const city = normalizeCityInput(homestay.address?.City || homestay.address?.Locality || addressParts[0] || '');

            if (!city) {
                continue;
            }

            const country = normalizeCityInput(addressParts[addressParts.length - 1] || 'India') || 'India';
            const state = normalizeCityInput(addressParts[addressParts.length - 2] || '');
            const countryCode = country.toLowerCase() === 'india' ? 'IN' : '';
            const key = `${city.toLowerCase()}|${state.toLowerCase()}|${country.toLowerCase()}`;

            if (!cityMap.has(key)) {
                cityMap.set(key, {
                    cityId: key,
                    city,
                    state,
                    stateCode: '',
                    country,
                    countryCode
                });
            }
        }

        const suggestions = Array.from(cityMap.values())
            .sort((a, b) => {
                const scoreDiff = buildCitySuggestionScore(query, b) - buildCitySuggestionScore(query, a);
                if (scoreDiff !== 0) return scoreDiff;
                return a.city.localeCompare(b.city);
            })
            .slice(0, 20);

        if (!suggestions.length) {
            res.status(404).json({
                data: null,
                Status: { Code: 404, Message: "No results found" }
            });
            return;
        }

        res.status(200).json({
            data: suggestions,
            Status: { Code: 200, Message: 'OK' }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: { Code: 500, Message: (error as Error).message }
        });
    }
};

export const getAllHomestays = async (
    req: Request<{}, any, any, SearchHomestay>,
    res: Response<DefaultResponseBody<IHomestay[]>>
) => {
    try {
        const {
            homestayOwnerId,
            name,
            city,
            locality,
            lat,
            lng,
            checkIn,
            checkOut,
            adults,
            children,
            units,
            unit,
            rooms,
            minPrice,
            maxPrice,
            amenities,
            skip = '0',
            limit = '20'
        } = req.query;

        const toNumber = (value: unknown): number | null => {
            if (value === undefined || value === null || value === '') {
                return null;
            }

            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };

        const parsedSkip = Math.max(0, toNumber(skip) ?? 0);
        const parsedLimit = Math.max(1, toNumber(limit) ?? 20);

        const parsedLat = toNumber(lat);
        const parsedLng = toNumber(lng);
        if ((lat && parsedLat === null) || (lng && parsedLng === null)) {
            res.status(400).json({
                data: null,
                Status: { Code: 400, Message: "lat and lng must be valid numbers" }
            });
            return;
        }

        const parsedMinPrice = toNumber(minPrice);
        const parsedMaxPrice = toNumber(maxPrice);

        if ((minPrice && parsedMinPrice === null) || (maxPrice && parsedMaxPrice === null)) {
            res.status(400).json({
                data: null,
                Status: { Code: 400, Message: "minPrice and maxPrice must be valid numbers" }
            });
            return;
        }

        if (
            parsedMinPrice !== null &&
            parsedMaxPrice !== null &&
            parsedMinPrice > parsedMaxPrice
        ) {
            res.status(400).json({
                data: null,
                Status: { Code: 400, Message: "minPrice cannot be greater than maxPrice" }
            });
            return;
        }

        const parsedAdults = toNumber(adults);
        const parsedChildren = toNumber(children);
        const rawUnits = units ?? unit ?? rooms;
        const parsedUnits = toNumber(rawUnits);

        if (adults && (parsedAdults === null || parsedAdults < 1 || !Number.isInteger(parsedAdults))) {
            res.status(400).json({
                data: null,
                Status: { Code: 400, Message: "adults must be a positive integer" }
            });
            return;
        }

        if (children && (parsedChildren === null || parsedChildren < 0 || !Number.isInteger(parsedChildren))) {
            res.status(400).json({
                data: null,
                Status: { Code: 400, Message: "children must be a non-negative integer" }
            });
            return;
        }

        if (rawUnits && (parsedUnits === null || parsedUnits < 1 || !Number.isInteger(parsedUnits))) {
            res.status(400).json({
                data: null,
                Status: { Code: 400, Message: "units must be a positive integer" }
            });
            return;
        }

        const hasDateFilter = Boolean(checkIn || checkOut);
        let parsedCheckIn: Date | null = null;
        let parsedCheckOut: Date | null = null;

        if (hasDateFilter) {
            if (!checkIn || !checkOut) {
                res.status(400).json({
                    data: null,
                    Status: { Code: 400, Message: "checkIn and checkOut are required together" }
                });
                return;
            }

            parsedCheckIn = new Date(checkIn);
            parsedCheckOut = new Date(checkOut);

            if (Number.isNaN(parsedCheckIn.getTime()) || Number.isNaN(parsedCheckOut.getTime())) {
                res.status(400).json({
                    data: null,
                    Status: { Code: 400, Message: "checkIn and checkOut must be valid dates" }
                });
                return;
            }

            if (!dayjs(parsedCheckOut).isAfter(dayjs(parsedCheckIn), 'day')) {
                res.status(400).json({
                    data: null,
                    Status: { Code: 400, Message: "checkOut must be at least one day after checkIn" }
                });
                return;
            }
        }

        const requestedUnits = parsedUnits ?? 1;
        const requestedAdults = parsedAdults ?? 0;
        const requestedChildren = parsedChildren ?? 0;
        const hasOccupancyFilter = Boolean(adults || children || rawUnits);
        const filters: Record<string, unknown> = {};

        if (homestayOwnerId && Types.ObjectId.isValid(homestayOwnerId)) {
            filters.homestayOwnerId = new Types.ObjectId(homestayOwnerId);
        }
        if (name) filters.name = new RegExp(name, "i");
        if (city) {
            const cityFilters = buildCityRegexFilters(city);
            if (cityFilters.length) {
                filters.$or = cityFilters;
            }
        }
        if (locality) filters["address.Locality"] = new RegExp(locality, "i");
        if (amenities) filters.amenities = { $all: amenities.split(',').map(item => item.trim()) };
        if (parsedMinPrice !== null || parsedMaxPrice !== null) {
            filters["units.price"] = {
                ...(parsedMinPrice !== null ? { $gte: parsedMinPrice } : {}),
                ...(parsedMaxPrice !== null ? { $lte: parsedMaxPrice } : {})
            };
        }

        let query = Homestay.find(filters).sort({ _id: -1 });

        if (parsedLat !== null && parsedLng !== null) {
            query = Homestay.find({
                ...filters,
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [parsedLng, parsedLat]
                        },
                        $maxDistance: 20000
                    }
                }
            }).sort({ _id: -1 });
        }

        const shouldApplyAvailability = hasDateFilter || hasOccupancyFilter;

        if (!shouldApplyAvailability) {
            const data = await query.skip(parsedSkip).limit(parsedLimit);

            res.status(200).json({ data: data as unknown as IHomestay[], Status: { Code: 200, Message: "Homestays fetched successfully" } });
            return;
        }

        const homestays = await query;

        if (!homestays.length) {
            res.status(200).json({ data: [], Status: { Code: 200, Message: "Homestays fetched successfully" } });
            return;
        }

        const bookedUnitsMap = new Map<string, number>();

        if (parsedCheckIn && parsedCheckOut) {
            const homestayIds = homestays.map((item) => new Types.ObjectId(String(item._id)));

            const overlappingBookings = await Booking.aggregate<{
                _id: { homestayId: Types.ObjectId; unitType: string; };
                bookedUnits: number;
            }>([
                {
                    $match: {
                        bookingType: BookingType.Homestay,
                        status: { $ne: BookingStatus.CANCELLED },
                        'bookingDetails.ifHomeStayBooked.homestayId': { $in: homestayIds },
                    }
                },
                {
                    $match: {
                        $expr: {
                            $or: [
                                {
                                    $and: [
                                        { $lte: ["$bookingDetails.ifHomeStayBooked.checkIn", parsedCheckIn] },
                                        { $gt: ["$bookingDetails.ifHomeStayBooked.checkOut", parsedCheckIn] }
                                    ]
                                },
                                {
                                    $and: [
                                        { $lt: ["$bookingDetails.ifHomeStayBooked.checkIn", parsedCheckOut] },
                                        { $gte: ["$bookingDetails.ifHomeStayBooked.checkOut", parsedCheckOut] }
                                    ]
                                },
                                {
                                    $and: [
                                        { $gte: ["$bookingDetails.ifHomeStayBooked.checkIn", parsedCheckIn] },
                                        { $lte: ["$bookingDetails.ifHomeStayBooked.checkOut", parsedCheckOut] }
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            homestayId: "$bookingDetails.ifHomeStayBooked.homestayId",
                            unitType: "$bookingDetails.ifHomeStayBooked.unitType",
                        },
                        bookedUnits: { $sum: "$bookingDetails.ifHomeStayBooked.units" }
                    }
                }
            ]);

            for (const booking of overlappingBookings) {
                const key = `${String(booking._id.homestayId)}::${booking._id.unitType}`;
                bookedUnitsMap.set(key, Number(booking.bookedUnits || 0));
            }
        }

        const filteredHomestays = homestays.filter((homestay) => {
            const unitTypeStats = new Map<string, {
                totalUnits: number;
                maxAdults: number;
                maxChildren: number;
                minPrice: number;
                maxPrice: number;
            }>();

            for (const homestayUnit of homestay.units || []) {
                const unitType = String(homestayUnit.type || '').trim();
                if (!unitType) {
                    continue;
                }

                const unitPrice = Number(homestayUnit.price || 0);
                const unitMaxAdults = Number(homestayUnit.maxAdults || 0);
                const unitMaxChildren = Number(homestayUnit.maxChildren || 0);

                if (!unitTypeStats.has(unitType)) {
                    unitTypeStats.set(unitType, {
                        totalUnits: 1,
                        maxAdults: unitMaxAdults,
                        maxChildren: unitMaxChildren,
                        minPrice: unitPrice,
                        maxPrice: unitPrice,
                    });
                    continue;
                }

                const unitInfo = unitTypeStats.get(unitType) as {
                    totalUnits: number;
                    maxAdults: number;
                    maxChildren: number;
                    minPrice: number;
                    maxPrice: number;
                };

                unitInfo.totalUnits += 1;
                unitInfo.maxAdults = Math.max(unitInfo.maxAdults, unitMaxAdults);
                unitInfo.maxChildren = Math.max(unitInfo.maxChildren, unitMaxChildren);
                unitInfo.minPrice = Math.min(unitInfo.minPrice, unitPrice);
                unitInfo.maxPrice = Math.max(unitInfo.maxPrice, unitPrice);
            }

            for (const [unitType, unitInfo] of unitTypeStats.entries()) {
                const bookedUnits = parsedCheckIn && parsedCheckOut
                    ? (bookedUnitsMap.get(`${String(homestay._id)}::${unitType}`) || 0)
                    : 0;
                const availableUnits = Math.max(0, unitInfo.totalUnits - bookedUnits);

                if (availableUnits < requestedUnits) {
                    continue;
                }

                if (requestedAdults > unitInfo.maxAdults * requestedUnits) {
                    continue;
                }

                if (requestedChildren > unitInfo.maxChildren * requestedUnits) {
                    continue;
                }

                if (parsedMinPrice !== null && unitInfo.maxPrice < parsedMinPrice) {
                    continue;
                }

                if (parsedMaxPrice !== null && unitInfo.minPrice > parsedMaxPrice) {
                    continue;
                }

                return true;
            }

            return false;
        });

        const data = filteredHomestays.slice(parsedSkip, parsedSkip + parsedLimit);

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
