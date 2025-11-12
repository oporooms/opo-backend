import { removeNoSqlInjection } from "@/functions";
import { getNextId } from "@/functions/mongoFunc";
import Hotel from "@/schemas/Hotel/Hotel";
import Room from "@/schemas/Room";
import User from "@/schemas/User";
import { HotelListResponse } from "@/types/BdsdHotel/HotelList";
import { DefaultResponseBody } from "@/types/default";
import { HotelStatus, IHotel, SearchHotel } from "@/types/hotel";
import { IRooms } from "@/types/rooms";
import { UserRole } from "@/types/user";
import axios from "axios";
import dayjs from "dayjs";
import type { Request, Response } from "express";
import { PipelineStage, Types } from "mongoose";
import dotenv from "dotenv";
import { AxiosError } from "axios";


if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env" });
} else {
    dotenv.config({ path: ".env.local" });
}

// Create a new hotel
export const createHotel = async (
    req: Request<{}, {}, Partial<IHotel>>,
    res: Response<DefaultResponseBody<IHotel>>
) => {
    try {
        const hotel = new Hotel(req.body);
        await hotel.save();
        res.status(201).json({
            data: hotel,
            Status: {
                Code: 201,
                Message: ""
            }
        });
    } catch (error) {
        res.status(400).json({ data: null, Status: { Code: 400, Message: (error as Error).message } });
    }
};

export const createHotelWithRooms = async (
    req: Request<{}, {}, Partial<{
        hotel: IHotel,
        rooms: IRooms[]
    }>>,
    res: Response<DefaultResponseBody<{ hotel: IHotel, rooms?: IRooms[] }>>
): Promise<void> => {
    const { hotel, rooms } = req.body

    if (!hotel) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Hotel payload is required."
            }
        })
        return
    }

    console.log('hotel', hotel);
    console.log('rooms', rooms);

    const userId = req.user?.userId

    console.log('userId', userId);

    if (!userId) {
        res.status(401).json({
            data: null,
            Status: {
                Code: 401,
                Message: "Unauthorized"
            }
        });
        return;
    }

    const user = await User.findOne({
        _id: new Types.ObjectId(userId),
        $or: [
            { userRole: { $eq: UserRole.HotelOwner } },
            { userRole: { $eq: UserRole.SADMIN } }
        ]
    }).lean();

    console.log('user', user);

    if (!user) {
        res.status(403).json({
            data: null,
            Status: {
                Code: 403,
                Message: "You do not have permission to delete this room."
            }
        });
        return;
    }

    const sanitizeObjectId = (value: unknown): Types.ObjectId | undefined => {
        if (!value) return undefined
        const stringValue = String(value)
        if (!stringValue || stringValue === 'undefined') return undefined
        if (!Types.ObjectId.isValid(stringValue)) return undefined
        return new Types.ObjectId(stringValue)
    }

    const sanitizedHotel: Partial<IHotel> = { ...hotel }

    const fallbackOwnerId = sanitizeObjectId(user._id) ?? (user._id as unknown as Types.ObjectId)
    const hotelOwnerObjectId = sanitizeObjectId(sanitizedHotel.hotelOwnerId) ?? fallbackOwnerId
    if (!hotelOwnerObjectId) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "A valid hotelOwnerId is required."
            }
        })
        return
    }

    const existingHotelId = sanitizeObjectId(sanitizedHotel._id)
    if (existingHotelId) {
        sanitizedHotel._id = existingHotelId as unknown as Types.ObjectId
    } else {
        delete (sanitizedHotel as Partial<IHotel> & { _id?: Types.ObjectId })._id
    }

    sanitizedHotel.hotelOwnerId = hotelOwnerObjectId as unknown as Types.ObjectId

    if (sanitizedHotel.address) {
        sanitizedHotel.address = {
            ...sanitizedHotel.address,
            lat: Number(sanitizedHotel.address.lat ?? 0) || 0,
            lng: Number(sanitizedHotel.address.lng ?? 0) || 0,
        }
    }

    if (sanitizedHotel.location?.coordinates) {
        const [lng = 0, lat = 0] = sanitizedHotel.location.coordinates
        sanitizedHotel.location = {
            type: 'Point',
            coordinates: [Number(lng) || 0, Number(lat) || 0]
        }
    }

    if (!Array.isArray(sanitizedHotel.photos)) {
        sanitizedHotel.photos = Array.isArray(hotel.photos) ? hotel.photos : []
    }

    if (!Array.isArray(sanitizedHotel.amenities)) {
        sanitizedHotel.amenities = Array.isArray(hotel.amenities) ? hotel.amenities : []
    }

    const hotelRes = new Hotel(sanitizedHotel);
    console.log('hotelRes', hotelRes);
    const hotelOwnerId = hotelRes.hotelOwnerId
    console.log('hotelOwnerId', hotelOwnerId);
    const hotelId = hotelRes._id
        console.log('hotelId', hotelId);
    await hotelRes.save()

    if (rooms) {
        console.log('rooms provided:', rooms);
        console.log('hotelRes:', hotelRes);
        console.log('hotelOwnerId:', hotelOwnerId, 'hotelId:', hotelId);

        const docs = await Promise.all(rooms.map(async (data, idx) => {
            console.log(`processing room index ${idx}:`, data);
            const id = await getNextId({ id: "roomUId" });
            console.log(`generated roomUId for index ${idx}:`, id);

            const roomOwnerId = sanitizeObjectId(data?.hotelOwnerId) ?? hotelOwnerId;

            const doc: Record<string, unknown> = {
                ...data,
                hotelOwnerId: roomOwnerId,
                hotelId,
                roomUId: id,
                number: Number(data?.number ?? 0),
                floorNumber: Number(data?.floorNumber ?? 0),
            };
            console.log(`created doc for index ${idx}:`, doc);
            return doc as unknown as IRooms;
        }));

        console.log('prepared docs for insert:', docs);

        try {
            console.log('inserting docs count:', docs.length);
            const roomResInserted = await Room.insertMany(docs);
            console.log('insertMany succeeded, inserted count:', roomResInserted.length);

            const roomIds = roomResInserted.map((roomDoc) => roomDoc._id);
            console.log('inserted roomIds:', roomIds);

            const roomResp = await Room.find({ _id: { $in: roomIds } }) as unknown as IRooms[];
            console.log('fetched inserted rooms from DB:', roomResp);

            res.status(201).json({
                data: { hotel: hotelRes, rooms: roomResp },
                Status: { Code: 0, Message: '' }
            });
            return;
        } catch (err: any) {
            console.log('error while inserting rooms:', err);
            if (err && (err as any).code === 11000) {
                console.log('duplicate room error detail:', (err as any).keyValue ?? (err as any).message);
                res.status(400).json({
                    data: null,
                    Status: {
                        Code: 2,
                        Message: 'Duplicate room: Room with the same number and type already exists in this hotel.'
                    }
                });
                return;
            }
            res.status(400).json({
                data: null,
                Status: {
                    Code: 1,
                    Message: err?.message ?? 'Unknown error'
                }
            });
        }
    }

    res.status(201).json({
        data: { hotel: hotelRes },
        Status: { Code: 0, Message: '' }
    });
};

export const getAllHotels = async (req: Request<{}, any, any, SearchHotel>, res: Response<DefaultResponseBody<IHotel[]>>): Promise<void> => {
    try {
        const { hotelOwnerId, userId, name, nameNot, customAddress, desc, city, locality, lat, lng, placeId, regularPrice, salePrice, minPrice, maxPrice, minRating, maxRating, amenities, sort, skip = '0', limit = '10', nextId } = req.query;
        const filters: Record<string, unknown> = {};

        if (hotelOwnerId) filters.hotelOwnerId = new Types.ObjectId(hotelOwnerId as string);
        if (name) filters.name = new RegExp(name, "i");
        if (nameNot) filters.name = { $not: new RegExp(nameNot, 'i') };
        if (customAddress) filters.customAddress = new RegExp(customAddress, "i");
        if (desc) filters.desc = new RegExp(desc, "i");
        if (city) filters["address.City"] = new RegExp(city, "i");
        if (locality) filters["address.Locality"] = new RegExp(locality, "i");
        if (lat) filters["address.lat"] = parseFloat(lat);
        if (lng) filters["address.lng"] = parseFloat(lng);
        if (placeId) filters["address.placeId"] = placeId;
        if (regularPrice) filters["rooms.regularPrice"] = parseFloat(regularPrice);
        if (salePrice) filters["rooms.salePrice"] = parseFloat(salePrice);
        if (amenities) filters["amenities"] = { $all: amenities.split(',').map(item => item.trim()) };

        if (minPrice) {
            filters['rooms.0.price'] = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
        } else if (minPrice) {
            filters['rooms.0.price'] = { $gte: parseFloat(minPrice) };
        }

        if (minRating && maxRating) {
            filters['$expr'] = {
                $and: [{ $gte: [{ $cond: [{ $eq: ['$totalRatingsCount', 0] }, 0, { $divide: ['$totalRatingsSum', '$totalRatingsCount'] }] }, parseFloat(minRating)] }, { $lte: [{ $cond: [{ $eq: ['$totalRatingsCount', 0] }, 0, { $divide: ['$totalRatingsSum', '$totalRatingsCount'] }] }, parseFloat(maxRating)] }]
            };
        } else if (minRating) {
            filters['$expr'] = {
                $gte: [{ $cond: [{ $eq: ['$totalRatingsCount', 0] }, 0, { $divide: ['$totalRatingsSum', '$totalRatingsCount'] }] }, parseFloat(minRating)]
            };
        }

        if (sort === 'price_highest') {
            filters['rooms.0.price'] = -1;
        } else if (sort === 'price_lowest') {
            filters['rooms.0.price'] = 1;
        } else {
            filters['averageRating'] = -1;
            filters['_id'] = -1;
        }

        let pipeline: PipelineStage[] = [];

        if (lat && lng) {
            pipeline.push({
                $geoNear: {
                    near: { type: 'Point', coordinates: [Number(lng) || 0, Number(lat) || 0] },
                    distanceField: 'dist.calculated',
                    includeLocs: 'location',
                    spherical: true,
                    minDistance: 0,
                    maxDistance: 10000
                }
            });
        }

        if (userId) {
            pipeline.push({
                $lookup: {
                    from: 'Wishlist',
                    let: { hotelId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$type', 'Hotel'] },
                                        { $eq: ['$ifHotelWishListed._id', '$$hotelId'] },
                                        { $eq: ['$userId', new Types.ObjectId(userId)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'Wishlisted'
                }
            });
        }

        if (nextId) {
            pipeline.push({ $match: { _id: { $gt: new Types.ObjectId(nextId) } } });
        }

        pipeline.push(
            { $lookup: { from: 'Users', localField: 'hotelOwnerId', foreignField: '_id', as: 'hotelOwner' } },
            { $lookup: { from: 'Rooms', localField: '_id', foreignField: 'hotelId', as: 'Rooms' } },
            { $lookup: { from: 'Ratings', localField: '_id', foreignField: 'hotelId', as: 'Ratings' } },
            { $lookup: { from: 'Bookings', localField: '_id', foreignField: 'bookingDetails.ifHotelBooked.hotelId', as: 'Bookings' } },
            { $unwind: { path: "$hotelOwner", preserveNullAndEmptyArrays: true } },
            { $match: { status: HotelStatus.APPROVED, ...filters } },
            { $skip: parseInt(skip) },
            { $limit: Math.min(parseInt(limit), 100) }
        );

        const hotels = await Hotel.aggregate(pipeline) as IHotel[];



        res.status(200).json({ data: hotels, Status: { Code: 0, Message: '' } });
    } catch (error) {
        res.status(500).json({ data: null, Status: { Code: 1, Message: (error as Error).message } });
    }
};

export const getHotelsForHotelOwner = async (req: Request, res: Response<DefaultResponseBody<IHotel[]>>): Promise<void> => {
    try {
        const userId = req.user?.userId;

        const user = await User.findOne({ _id: userId });

        if (!user || user.userRole !== UserRole.HotelOwner) {
            res.status(403).json({ data: null, Status: { Code: 1, Message: 'Forbidden' } });
            return;
        }

        const hotels = await Hotel.find({ hotelOwnerId: userId }).lean();

        res.status(200).json({ data: hotels, Status: { Code: 0, Message: '' } });
    } catch (error) {
        res.status(500).json({ data: null, Status: { Code: 1, Message: (error as Error).message } });
    }
};

export const getSearchedSingleHotel = async (req: Request<{ slug: string }>, res: Response<DefaultResponseBody<IHotel>>): Promise<void> => {
    try {
        const { slug } = req.params;

        const hotel = await Hotel.findOne({ _id: new Types.ObjectId(slug), status: HotelStatus.APPROVED }).lean();

        if (!hotel) {
            res.status(404).json({ data: null, Status: { Code: 404, Message: 'Hotel not found' } });
            return;
        }
        res.status(200).json({ data: hotel as IHotel, Status: { Code: 200, Message: '' } });
    } catch (error) {
        res.status(500).json({ data: null, Status: { Code: 1, Message: (error as Error).message } });
    }
}

export const searchHotelsForBooking = async (req: Request<{}, any, SearchHotel>, res: Response<DefaultResponseBody<{
    hotels: IHotel[],
    bdsdHotels: HotelListResponse | null
}>>): Promise<void> => {
    const { userId, name, nameNot, checkIn, checkOut, cityId, rooms, adults, child, childAge, customAddress, desc, city, locality, lat, lng, placeId, regularPrice, salePrice, minPrice, maxPrice, minRating, maxRating, amenities, sort, skip = '0', limit = '100', nextId } = req.body;

    const filters: Record<string, unknown> = {};
    const sortFilter: Record<string, 1 | -1> = {};

    if (name) filters.name = new RegExp(name, "i");
    if (nameNot) filters.name = { $not: new RegExp(nameNot, 'i') };
    if (customAddress) filters.customAddress = new RegExp(customAddress, "i");
    if (desc) filters.desc = new RegExp(desc, "i");
    if (city) {
        const cityTerm = String(city).trim();
        const lettersOnlyCity = cityTerm.replace(/[^a-zA-Z]/g, '');
        const escapedCity = cityTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const first3 = lettersOnlyCity.slice(0, 3);
        const escapedFirst3 = first3.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        filters['customAddress'] = new RegExp(escapedFirst3, 'i');
    }
    if (locality) filters["address.Locality"] = new RegExp(locality, "i");
    if (lat) filters["address.lat"] = parseFloat(lat);
    if (lng) filters["address.lng"] = parseFloat(lng);
    if (placeId) filters["address.placeId"] = placeId;
    if (regularPrice) filters["rooms.regularPrice"] = parseFloat(regularPrice);
    if (salePrice) filters["rooms.salePrice"] = parseFloat(salePrice);
    if (amenities) filters["amenities"] = { $all: amenities.split(',').map(item => item.trim()) };

    if (minPrice && maxPrice) {
        filters['rooms.0.price'] = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
    } else if (minPrice) {
        filters['rooms.0.price'] = { $gte: parseFloat(minPrice) };
    }

    // if (minRating && maxRating) {
    //     filters['$expr'] = {
    //         $and: [{ $gte: [{ $cond: [{ $eq: ['$totalRatingsCount', 0] }, 0, { $divide: ['$totalRatingsSum', '$totalRatingsCount'] }] }, parseFloat(minRating)] }, { $lte: [{ $cond: [{ $eq: ['$totalRatingsCount', 0] }, 0, { $divide: ['$totalRatingsSum', '$totalRatingsCount'] }] }, parseFloat(maxRating)] }]
    //     };
    // } else if (minRating) {
    //     filters['$expr'] = {
    //         $gte: [{ $cond: [{ $eq: ['$totalRatingsCount', 0] }, 0, { $divide: ['$totalRatingsSum', '$totalRatingsCount'] }] }, parseFloat(minRating)]
    //     };
    // }

    if (sort === 'price_highest') {
        sortFilter['rooms.0.price'] = -1;
    } else if (sort === 'price_lowest') {
        sortFilter['rooms.0.price'] = 1;
    } else {
        sortFilter['_id'] = -1;
    }

    let pipeline: PipelineStage[] = [];

    if (lat && lng) {
        pipeline.push({
            $geoNear: {
                near: { type: 'Point', coordinates: [Number(lng) || 0, Number(lat) || 0] },
                distanceField: 'dist.calculated',
                includeLocs: 'location',
                spherical: true,
                minDistance: 0,
                maxDistance: 10000
            }
        });
    }

    if (userId) {
        pipeline.push({
            $lookup: {
                from: 'Wishlist',
                let: { hotelId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$type', 'Hotel'] },
                                    { $eq: ['$ifHotelWishListed._id', '$$hotelId'] },
                                    { $eq: ['$userId', new Types.ObjectId(userId)] }
                                ]
                            }
                        }
                    }
                ],
                as: 'Wishlisted'
            }
        });
    }

    if (nextId) {
        pipeline.push({ $match: { _id: { $gt: new Types.ObjectId(nextId) } } });
    }

    pipeline.push(
        // { $lookup: { from: 'Users', localField: 'hotelOwnerId', foreignField: '_id', as: 'hotelOwner' } },
        // { $lookup: { from: 'Rooms', localField: '_id', foreignField: 'hotelId', as: 'Rooms' } },
        // { $lookup: { from: 'Ratings', localField: '_id', foreignField: 'hotelId', as: 'Ratings' } },
        // { $lookup: { from: 'Bookings', localField: '_id', foreignField: 'bookingDetails.ifHotelBooked.hotelId', as: 'Bookings' } },
        // { $unwind: { path: "$hotelOwner", preserveNullAndEmptyArrays: true } },
        { $match: { status: HotelStatus.APPROVED, ...filters } },
        { $skip: Number(skip) },
        { $limit: Number(limit) },
        { $sort: sortFilter }
    );

    // Run DB aggregation and external API call in parallel to reduce total latency
    const hotelsPromise = Hotel.aggregate(pipeline) as Promise<IHotel[]>;

    const shouldCallBdsd =
        Boolean(cityId) &&
        Boolean(checkIn) &&
        Boolean(checkOut) &&
        dayjs(checkIn).isValid() &&
        dayjs(checkOut).isValid();

    const bdsdHotelsPromise: Promise<DefaultResponseBody<HotelListResponse> | null> = shouldCallBdsd
        ? axios
            .post<DefaultResponseBody<HotelListResponse>>(
                `${process.env.SERVER_URL}/api/v1/bdsdHotel/searchHotel`,
                {
                    CheckInDate: dayjs(checkIn).format("YYYY-MM-DD"),
                    CheckOutDate: dayjs(checkOut).format("YYYY-MM-DD"),
                    NoOfNights: dayjs(checkOut).diff(dayjs(checkIn), "days"),
                    CountryCode: "IN",
                    DestinationCityId: cityId,
                    ResultCount: null,
                    GuestNationality: "IN",
                    NoOfRooms: rooms,
                    RoomGuests: [
                        {
                            Adult: adults,
                            Child: child,
                            ChildAge: childAge
                        }
                    ],
                    MaxRating: maxRating,
                    MinRating: minRating,
                    UserIp: (req.ip || "").replace("::ffff:", "")
                },
                {
                    // Fail fast so the endpoint doesn't block on the external API
                    timeout: Number(process.env.EXTERNAL_API_TIMEOUT_MS || 8000)
                }
            )
            .then(r => r.data)
            .catch(() => null) // Swallow external errors and proceed with local data
        : Promise.resolve(null);

    const [hotels, bdsdHotels] = await Promise.all([hotelsPromise, bdsdHotelsPromise]);

    if (!hotels && !bdsdHotels) {
        res.status(404).json({ data: null, Status: { Code: 404, Message: 'No hotels found' } });
    }

    res.status(200).json({
        data: {
            hotels,
            bdsdHotels: cityId ? bdsdHotels?.data as HotelListResponse | null : null
        }, Status: { Code: 200, Message: 'Data fetched successfully' }
    });
};

export const updateHotel = async (
    req: Request<{ _id: string }, DefaultResponseBody<IHotel>, IHotel>,
    res: Response<DefaultResponseBody<IHotel>>): Promise<void> => {
    try {
        const userId = req.user?.userId

        if (!userId) {
            res.status(401).json({
                data: null,
                Status: { Code: 1, Message: "User not authenticated." }
            });
            return;
        }

        const user = await User.findOne({
            _id: new Types.ObjectId(userId), userRole: {
                $or: [
                    { $eq: UserRole.HotelOwner },
                    { $eq: UserRole.SADMIN }
                ]
            }
        }).lean();

        if (!user) {
            res.status(403).json({
                data: null,
                Status: {
                    Code: 403,
                    Message: "You do not have permission to delete this room."
                }
            });
            return;
        }

        const _id = req.params._id
        const { ...updateData } = req.body;
        if (!_id) {
            res.status(400).json({
                data: null,
                Status: { Code: 2, Message: "Hotel ID (_id) is required for update." }
            });
            return;
        }

        const updatedHotel = await Hotel.findByIdAndUpdate(_id, updateData, { new: true });

        if (!updatedHotel) {
            res.status(404).json({
                data: null,
                Status: { Code: 3, Message: "Hotel not found." }
            });
            return;
        }

        res.status(200).json({
            data: updatedHotel,
            Status: { Code: 200, Message: "Hotel updated successfully." }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: { Code: 1, Message: (error as Error).message }
        });
    }
}

export const deleteHotel = async (
    req: Request<{ _id: string }, {}, {}, {}>,
    res: Response<DefaultResponseBody<IHotel>>
): Promise<void> => {
    try {
        const { _id } = req.params;
        const userId = req.user?.userId

        const user = await User.findOne({
            _id: new Types.ObjectId(userId), userRole: {
                $or: [
                    { $eq: UserRole.HotelOwner },
                    { $eq: UserRole.SADMIN }
                ]
            }
        }).lean();

        if (!user) {
            res.status(403).json({
                data: null,
                Status: {
                    Code: 403,
                    Message: "You do not have permission to delete this room."
                }
            });
            return;
        }

        if (!_id) {
            res.status(400).json({
                data: null,
                Status: { Code: 2, Message: "Hotel ID (_id) is required for deletion." }
            });
            return;
        }

        const deletedHotel = await Hotel.findByIdAndDelete(_id);

        if (!deletedHotel) {
            res.status(404).json({
                data: null,
                Status: { Code: 3, Message: "Hotel not found." }
            });
            return;
        }

        res.status(200).json({
            data: deletedHotel,
            Status: { Code: 0, Message: "Hotel deleted successfully." }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: { Code: 1, Message: (error as Error).message }
        });
    }
};

export const deleteMultipleHotels = async (
    req: Request<{}, {}, { ids: string[] }>,
    res: Response<DefaultResponseBody<{ deletedHotels: IHotel[], deletedRooms: IRooms[] }>>
): Promise<void> => {
    try {
        const { ids } = req.body;
        const userId = req.user?.userId

        const user = await User.findOne({
            _id: new Types.ObjectId(userId), userRole: {
                $or: [
                    { $eq: UserRole.HotelOwner },
                    { $eq: UserRole.SADMIN }
                ]
            }
        }).lean();

        if (!user) {
            res.status(403).json({
                data: null,
                Status: {
                    Code: 403,
                    Message: "You do not have permission to delete this room."
                }
            });
            return;
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({
                data: null,
                Status: { Code: 2, Message: "Hotel IDs (ids) are required for deletion." }
            });
            return;
        }

        const objectIds = ids.map(id => new Types.ObjectId(id));
        const deletedHotels = await Hotel.find({ _id: { $in: objectIds } });
        const deletedRooms = await Room.find({ hotelId: { $in: objectIds } })

        if (deletedHotels.length === 0) {
            res.status(404).json({
                data: null,
                Status: { Code: 3, Message: "No hotels found for the provided IDs." }
            });
            return;
        }

        await Hotel.deleteMany({ _id: { $in: objectIds } });
        await Room.deleteMany({ hotelId: { $in: objectIds } });

        res.status(200).json({
            data: { deletedHotels: deletedHotels, deletedRooms: deletedRooms },
            Status: { Code: 0, Message: "" }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: { Code: 1, Message: (error as Error).message }
        });
    }
};