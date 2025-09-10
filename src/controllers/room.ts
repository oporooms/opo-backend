import Hotel from "@/schemas/Hotel";
import Room from "@/schemas/Room";
import User from "@/schemas/User";
import { DefaultResponseBody } from "@/types/default";
import { IRooms } from "@/types/rooms";
import { UserRole } from "@/types/user";
import type { Request, Response } from "express";
import { Types } from "mongoose";

export const createRooms = async (
    req: Request<{}, {}, IRooms[]>,
    res: Response<DefaultResponseBody<IRooms[]>>
): Promise<void> => {
    try {
        const rooms = req.body
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

        if (!rooms || rooms.length == 0) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "No rooms data provided. Please provide at least one room to create."
                }
            });
            return;
        }

        const hotel = await Hotel.findOne({ _id: new Types.ObjectId(rooms[0]?.hotelId) }).lean()

        if (!hotel) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Hotel not found. Cannot create rooms without a valid hotel."
                }
            });
            return;
        }

        const hotelRoomTypes = new Set(hotel.rooms?.map(room => room.type));

        const existingRooms = await Room.find({
            hotelId: hotel._id,
            $or: rooms.map(room => ({
                number: room.number,
                type: room.type
            }))
        });

        if (existingRooms.length) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Duplicate rooms detected. Please ensure all rooms have unique number, type, and hotel."
                }
            });
            return;
        }

        const invalidTypes = rooms.filter(room => !hotelRoomTypes.has(room?.type as string));
        if (invalidTypes.length) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: `Invalid room type(s): ${invalidTypes.map(r => r?.type).join(", ")}. These types do not exist in the hotel's room types.`
                }
            });
            return;
        }

        const docs = await Promise.all(rooms.map(async (data) => {
            return {
                ...data,
                hotelOwnerId: new Types.ObjectId(hotel?.hotelOwnerId),
                hotelId: hotel?._id,
            };
        }));

        const roomResInserted = await Room.insertMany(docs);

        res.status(201).json({
            data: roomResInserted,
            Status: {
                Code: 201,
                Message: "Room created successfully"
            }
        });
    } catch (error) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: (error instanceof Error) ? error.message : "An error occurred while creating the room"
            }
        });
    }
}

export const getAllRooms = async (
    req: Request<{}, {}, {}, Partial<{ hotelOwnerId?: string, hotelId?: string }>>,
    res: Response<DefaultResponseBody<{ rooms: IRooms[], count: number }>>
): Promise<void> => {
    try {
        const filter: any = {}

        if (req.query.hotelOwnerId) filter.hotelOwnerId = new Types.ObjectId(req.query.hotelOwnerId)
        if (req.query.hotelId) filter.hotelId = new Types.ObjectId(req.query.hotelId)

        const rooms = await Room.find(filter).lean()

        if (!rooms || rooms.length == 0) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "No rooms found"
                }
            })
            return
        }

        const roomsCount = await Room.countDocuments(filter).lean()

        res.status(200).json({
            data: {
                rooms, count: roomsCount
            },
            Status: {
                Code: 200,
                Message: "Rooms found"
            }
        })

    } catch (error) {

    }

}

export const updateRoom = async (
    req: Request<{ _id: string }, {}, Partial<IRooms>>,
    res: Response<DefaultResponseBody<IRooms>>
): Promise<void> => {
    try {
        const { ...updateData } = req.body;
        const _id = req.params._id
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
                Status: {
                    Code: 400,
                    Message: "Room ID is required for update."
                }
            });
            return;
        }

        const updatedRoom = await Room.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedRoom) {
            res.status(404).json({
                data: null,
                Status: {
                    Code: 404,
                    Message: "Room not found."
                }
            });
            return;
        }

        res.status(200).json({
            data: updatedRoom,
            Status: {
                Code: 200,
                Message: "Room updated successfully."
            }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: (error instanceof Error) ? error.message : "An error occurred while updating the room."
            }
        });
    }
}

export const deleteRoom = async (
    req: Request<{ _id: string }, {}, Partial<IRooms>>,
    res: Response<DefaultResponseBody<IRooms>>
): Promise<void> => {
    try {
        const { _id } = req.params;
        const userId = req.user?.userId

        if (!userId) {
            res.status(401).json({
                data: null,
                Status: {
                    Code: 401,
                    Message: "You must be logged in to delete a room."
                }
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

        if (!_id) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Room ID is required for deletion."
                }
            });
            return;
        }

        const deletedRoom = await Room.findByIdAndDelete(_id).lean();
        if (!deletedRoom) {
            res.status(404).json({
                data: null,
                Status: {
                    Code: 404,
                    Message: "Room not found."
                }
            });
            return;
        }

        res.status(200).json({
            data: deletedRoom,
            Status: {
                Code: 200,
                Message: "Room deleted successfully."
            }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: (error instanceof Error) ? error.message : "An error occurred while deleting the room."
            }
        });
    }
}

export const deleteMultipleRooms = async (
    req: Request<{}, {}, { _ids: string[] }>,
    res: Response<DefaultResponseBody<IRooms>>
): Promise<void> => {
    try {
        const roomIds = Array.isArray(req.body._ids) ? req.body._ids.filter(Boolean) : [];
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

        if (!roomIds || roomIds.length === 0) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "No room IDs provided for deletion."
                }
            });
            return;
        }

        const result = await Room.deleteMany({ _id: { $in: roomIds } }).lean();
        if (result.deletedCount === 0) {
            res.status(404).json({
                data: null,
                Status: {
                    Code: 404,
                    Message: "No rooms found to delete."
                }
            });
            return;
        }

        res.status(200).json({
            data: null,
            Status: {
                Code: 200,
                Message: `${result.deletedCount} room(s) deleted successfully.`
            }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: (error instanceof Error) ? error.message : "An error occurred while deleting rooms."
            }
        });
    }
}