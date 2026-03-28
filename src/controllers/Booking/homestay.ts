import {
    CheckHomestayAvailabilityRequest,
    CheckHomestayAvailabilityResponse,
    CreateHomestayBookingRequest,
    CreateHomestayBookingResponse,
} from "@/types/Bookings/homestay";
import { DefaultResponseBody } from "@/types/default";
import { Request, Response } from "express";
import Booking from "@/schemas/Booking";
import { Types } from "mongoose";
import User from "@/schemas/User";
import axios from "axios";
import dotenv from "dotenv";
import { Bookings, BookingStatus, BookingType, CompanyApproval, PaymentMode, PaymentStatus } from "@/types/Bookings";
import dayjs from "dayjs";
import { Orders } from "razorpay/dist/types/orders";
import { IUser } from "@/types/user";
import Homestay from "@/schemas/Homestay/Homestay";

if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env" });
} else {
    dotenv.config({ path: ".env.local" });
}

interface AvailabilityComputation extends CheckHomestayAvailabilityResponse {
    selectedUnit: {
        type: string;
        price: number;
        maxAdults: number;
        maxChildren: number;
    };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[-()\d\s]{7,20}$/;
const VALID_PAYMENT_MODES = new Set<string>(Object.values(PaymentMode));

const toDate = (value: unknown) => {
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
};

const toInteger = (value: unknown, min = 0) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < min) {
        return null;
    }

    return parsed;
};

const getAvailabilitySummary = async ({
    homestayId,
    unitType,
    units,
    checkIn,
    checkOut,
    adults = 0,
    children = 0,
}: {
    homestayId: string;
    unitType: string;
    units: number;
    checkIn: Date;
    checkOut: Date;
    adults?: number;
    children?: number;
}): Promise<{ error?: { code: number; message: string; }; data?: AvailabilityComputation; }> => {
    if (!Types.ObjectId.isValid(homestayId)) {
        return {
            error: {
                code: 400,
                message: "Invalid homestay id",
            }
        };
    }

    const normalizedUnitType = unitType.trim();

    if (!normalizedUnitType) {
        return {
            error: {
                code: 400,
                message: "Unit type is required",
            }
        };
    }

    const homestay = await Homestay.findById(new Types.ObjectId(homestayId));

    if (!homestay) {
        return {
            error: {
                code: 404,
                message: "Homestay not found",
            }
        };
    }

    const sameTypeUnits = homestay.units.filter((item) => item.type === normalizedUnitType);

    if (!sameTypeUnits.length) {
        return {
            error: {
                code: 400,
                message: "Selected unit type not available",
            }
        };
    }

    const overlappingBookings = await Booking.aggregate([
        {
            $match: {
                bookingType: BookingType.Homestay,
                status: { $ne: BookingStatus.CANCELLED },
                'bookingDetails.ifHomeStayBooked.homestayId': new Types.ObjectId(homestayId),
                'bookingDetails.ifHomeStayBooked.unitType': normalizedUnitType,
            }
        },
        {
            $match: {
                $expr: {
                    $or: [
                        {
                            $and: [
                                { $lte: ["$bookingDetails.ifHomeStayBooked.checkIn", checkIn] },
                                { $gt: ["$bookingDetails.ifHomeStayBooked.checkOut", checkIn] }
                            ]
                        },
                        {
                            $and: [
                                { $lt: ["$bookingDetails.ifHomeStayBooked.checkIn", checkOut] },
                                { $gte: ["$bookingDetails.ifHomeStayBooked.checkOut", checkOut] }
                            ]
                        },
                        {
                            $and: [
                                { $gte: ["$bookingDetails.ifHomeStayBooked.checkIn", checkIn] },
                                { $lte: ["$bookingDetails.ifHomeStayBooked.checkOut", checkOut] }
                            ]
                        }
                    ]
                }
            }
        },
        {
            $project: {
                'bookingDetails.ifHomeStayBooked.units': 1,
            }
        }
    ]);

    const bookedUnits = overlappingBookings.reduce((acc, curr) => {
        return acc + Number(curr?.bookingDetails?.ifHomeStayBooked?.units || 0);
    }, 0);

    const totalUnits = sameTypeUnits.length;
    const availableUnits = Math.max(0, totalUnits - bookedUnits);
    const requestedUnits = Math.max(1, units);

    const selectedUnit = sameTypeUnits[0];
    const maxAdultsPerUnit = Number(selectedUnit.maxAdults || 0);
    const maxChildrenPerUnit = Number(selectedUnit.maxChildren || 0);

    const requestedAdults = Math.max(0, Number(adults || 0));
    const requestedChildren = Math.max(0, Number(children || 0));

    const maxAdultsAllowed = maxAdultsPerUnit * requestedUnits;
    const maxChildrenAllowed = maxChildrenPerUnit * requestedUnits;

    const enoughUnits = availableUnits >= requestedUnits;
    const withinOccupancy = requestedAdults <= maxAdultsAllowed && requestedChildren <= maxChildrenAllowed;

    let message = "Requested unit(s) are available for selected dates.";

    if (!enoughUnits) {
        message = `Only ${availableUnits} unit(s) are available for selected dates.`;
    } else if (!withinOccupancy) {
        message = `Selected occupancy exceeds limit. Maximum allowed for ${requestedUnits} unit(s): ${maxAdultsAllowed} adults and ${maxChildrenAllowed} children.`;
    }

    return {
        data: {
            homestayId: String(homestay._id),
            unitType: normalizedUnitType,
            requestedUnits,
            totalUnits,
            bookedUnits,
            availableUnits,
            available: enoughUnits && withinOccupancy,
            occupancy: {
                maxAdultsPerUnit,
                maxChildrenPerUnit,
                maxAdultsAllowed,
                maxChildrenAllowed,
                requestedAdults,
                requestedChildren,
                withinLimit: withinOccupancy,
            },
            message,
            selectedUnit: {
                type: selectedUnit.type,
                price: Number(selectedUnit.price || 0),
                maxAdults: maxAdultsPerUnit,
                maxChildren: maxChildrenPerUnit,
            },
        }
    };
};

export const checkHomestayAvailability = async (
    req: Request<any, any, CheckHomestayAvailabilityRequest>,
    res: Response<DefaultResponseBody<CheckHomestayAvailabilityResponse>>
) => {
    try {
        const homestayId = String(req.body.homestayId || '').trim();
        const unitType = String(req.body.unitType || '').trim();
        const units = toInteger(req.body.units, 1);
        const adults = toInteger(req.body.adults ?? 0, 0);
        const children = toInteger(req.body.children ?? 0, 0);
        const checkIn = toDate(req.body.checkIn);
        const checkOut = toDate(req.body.checkOut);

        if (!homestayId || !unitType || units === null || adults === null || children === null || !checkIn || !checkOut) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "homestayId, unitType, units, checkIn, checkOut, adults and children are required",
                }
            });
            return;
        }

        if (!dayjs(checkOut).isAfter(dayjs(checkIn), 'day')) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "checkOut must be at least one day after checkIn",
                }
            });
            return;
        }

        const availability = await getAvailabilitySummary({
            homestayId,
            unitType,
            units,
            checkIn,
            checkOut,
            adults,
            children,
        });

        if (availability.error) {
            res.status(availability.error.code).json({
                data: null,
                Status: {
                    Code: availability.error.code,
                    Message: availability.error.message,
                }
            });
            return;
        }

        const { selectedUnit: _, ...response } = availability.data as AvailabilityComputation;

        res.status(200).json({
            data: response,
            Status: {
                Code: 200,
                Message: response.message,
            }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: (error as Error).message || "Something went wrong",
            }
        });
    }
};

export const createHomestayBooking = async (
    req: Request<any, any, CreateHomestayBookingRequest>,
    res: Response<DefaultResponseBody<CreateHomestayBookingResponse>>
) => {
    try {
        const { traveller, homestayId, units, checkIn, checkOut, adults, children, unitType, paymentMode } = req.body;

        const trimmedHomestayId = String(homestayId || '').trim();
        const trimmedUnitType = String(unitType || '').trim();
        const parsedUnits = toInteger(units, 1);
        const parsedAdults = toInteger(adults, 1);
        const parsedChildren = toInteger(children, 0);
        const parsedCheckIn = toDate(checkIn);
        const parsedCheckOut = toDate(checkOut);

        if (!traveller) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Traveller details are required",
                }
            });
            return;
        }

        const normalizedTraveller = {
            email: String(traveller.email || '').trim(),
            fullname: String(traveller.fullname || '').trim(),
            phone: String(traveller.phone || '').trim(),
            address: String(traveller.address || '').trim(),
            dob: toDate(traveller.dob),
            gender: String(traveller.gender || '').trim(),
            panNo: String(traveller.panNo || '').trim(),
            gstDetails: traveller.gstDetails,
        };

        if (
            !trimmedHomestayId ||
            !trimmedUnitType ||
            parsedUnits === null ||
            parsedAdults === null ||
            parsedChildren === null ||
            !parsedCheckIn ||
            !parsedCheckOut
        ) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "homestayId, unitType, units, checkIn, checkOut, adults and children are required",
                }
            });
            return;
        }

        if (!VALID_PAYMENT_MODES.has(String(paymentMode || ''))) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Invalid payment mode",
                }
            });
            return;
        }

        if (!EMAIL_REGEX.test(normalizedTraveller.email)) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide a valid traveller email",
                }
            });
            return;
        }

        if (!PHONE_REGEX.test(normalizedTraveller.phone)) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Please provide a valid traveller phone",
                }
            });
            return;
        }

        if (!normalizedTraveller.fullname || !normalizedTraveller.address || !normalizedTraveller.gender || !normalizedTraveller.dob) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "Traveller fullname, address, dob and gender are required",
                }
            });
            return;
        }

        if (!dayjs(parsedCheckOut).isAfter(dayjs(parsedCheckIn), 'day')) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: "checkOut must be at least one day after checkIn",
                }
            });
            return;
        }

        const availability = await getAvailabilitySummary({
            homestayId: trimmedHomestayId,
            unitType: trimmedUnitType,
            units: parsedUnits,
            checkIn: parsedCheckIn,
            checkOut: parsedCheckOut,
            adults: parsedAdults,
            children: parsedChildren,
        });

        if (availability.error) {
            res.status(availability.error.code).json({
                data: null,
                Status: {
                    Code: availability.error.code,
                    Message: availability.error.message,
                }
            });
            return;
        }

        if (!availability.data?.available) {
            res.status(400).json({
                data: null,
                Status: {
                    Code: 400,
                    Message: availability.data?.message || "Selected unit is not available",
                }
            });
            return;
        }

        const totalDays = Math.max(1, dayjs(parsedCheckOut).diff(dayjs(parsedCheckIn), 'day'));

        const user = await User.findById(new Types.ObjectId(String(req.user?.userId)));
        const createdById = await User.findById(new Types.ObjectId(String(req.user?.userId)));

        if (!createdById) {
            res.status(404).json({
                data: null,
                Status: {
                    Code: 404,
                    Message: "Unauthorized",
                }
            });
            return;
        }

        const selectedUnit = availability.data.selectedUnit;
        const cost = Number(selectedUnit.price) * parsedUnits * totalDays;
        const tax = cost * 0.12;
        const total = Math.round(cost + tax);
        const normalizedPaymentMode = paymentMode as PaymentMode;

        const obj: Bookings = {
            userId: [new Types.ObjectId(String(req.user?.userId))],
            bookingType: BookingType.Homestay,
            bookingDate: new Date(),
            bookingDetails: {
                companyApproval: CompanyApproval.Approved,
                ifHomeStayBooked: {
                    homestayId: new Types.ObjectId(trimmedHomestayId),
                    assignedUnits: [],
                    units: parsedUnits,
                    checkIn: parsedCheckIn,
                    checkOut: parsedCheckOut,
                    adults: parsedAdults,
                    childrens: parsedChildren,
                    totalDays,
                    unitType: selectedUnit.type,
                    traveller: {
                        email: normalizedTraveller.email,
                        fullname: normalizedTraveller.fullname,
                        phone: normalizedTraveller.phone,
                        address: normalizedTraveller.address,
                        dob: normalizedTraveller.dob,
                        gender: normalizedTraveller.gender,
                        panNo: normalizedTraveller.panNo,
                    }
                },
            },
            status: normalizedPaymentMode === PaymentMode.onlinePay ? BookingStatus.PENDING : BookingStatus.BOOKED,
            payment: {
                mode: normalizedPaymentMode,
                status: normalizedPaymentMode === PaymentMode.onlinePay ? PaymentStatus.pending : PaymentStatus.success,
                cost,
                fee: +tax,
                total,
                transactionDetails: {
                    date: null,
                    id: '',
                    mode: normalizedPaymentMode,
                    orderId: '',
                },
            },
            gstDetails: normalizedTraveller.gstDetails as Bookings['gstDetails'],
            createdBy: new Types.ObjectId(createdById._id.toString()),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (normalizedPaymentMode === PaymentMode.payByCompany) {
            const companyId = createdById.userRole === 'CADMIN' ? createdById._id : createdById.companyId;
            const companyWallet = await User.findOne({ _id: companyId as string });

            if (!companyWallet?.wallet || companyWallet.wallet < obj.payment.total) {
                res.status(400).json({
                    data: null,
                    Status: {
                        Code: 400,
                        Message: "Insufficient balance in company wallet",
                    }
                });
                return;
            }

            obj.bookingDetails.companyApproval = createdById.userRole === 'EMPLOYEE' ? CompanyApproval.Pending : CompanyApproval.Approved;
            obj.payment.status = createdById.userRole === 'EMPLOYEE' ? PaymentStatus.pending : PaymentStatus.success;
            obj.status = createdById.userRole === 'EMPLOYEE' ? BookingStatus.PENDING : BookingStatus.BOOKED;
            obj.createdBy = new Types.ObjectId(String(companyId));
        }

        if (normalizedPaymentMode === PaymentMode.payAtHotel) {
            obj.payment.status = PaymentStatus.pending;
            obj.status = BookingStatus.BOOKED;
        }

        const createdBooking = await Booking.insertOne({ ...obj });

        if (!createdBooking._id) {
            res.status(500).json({
                data: null,
                Status: {
                    Code: 500,
                    Message: "Failed to create booking",
                }
            });
            return;
        }

        let order: DefaultResponseBody<Orders.RazorpayOrder> | null = null;

        if (normalizedPaymentMode === PaymentMode.onlinePay) {
            order = await axios.post<DefaultResponseBody<Orders.RazorpayOrder>>(
                `${process.env.SERVER_URL}/api/v1/payment/razorpay/createOrder`,
                {
                    amount: total,
                    currency: "INR",
                    receipt: createdBooking._id.toString(),
                },
                {
                    headers: {
                        Authorization: req.headers.authorization
                    }
                }
            ).then((r) => r.data).catch(() => null);

            if (!order?.data?.id) {
                await Booking.findByIdAndUpdate(createdBooking._id, {
                    $set: {
                        status: BookingStatus.CANCELLED,
                        'payment.status': PaymentStatus.declined
                    }
                });

                res.status(500).json({
                    data: null,
                    Status: {
                        Code: 500,
                        Message: "Failed to initialize payment order",
                    }
                });
                return;
            }

            await Booking.findByIdAndUpdate(createdBooking._id, {
                $set: {
                    'payment.transactionDetails.orderId': order.data.id,
                    'payment.transactionDetails.id': order.data.id,
                    'payment.transactionDetails.mode': PaymentMode.onlinePay,
                    status: BookingStatus.PENDING,
                    'payment.status': PaymentStatus.pending,
                }
            });
        }

        res.status(200).json({
            data: {
                order: order?.data,
                bookingId: createdBooking._id.toString(),
                user: user as IUser,
            },
            Status: {
                Code: 200,
                Message: "Homestay booking initialized successfully",
            }
        });
    } catch (error) {
        res.status(500).json({
            data: null,
            Status: {
                Code: 500,
                Message: (error as Error).message || "Failed to create booking",
            }
        });
    }
};

export const getHomestayBookings = async (
    req: Request,
    res: Response<DefaultResponseBody<Bookings[]>>
) => {
    const userId = req.user?.userId;

    const bookings = await Booking.aggregate([
        {
            $match: {
                $or: [
                    { userId: { $in: [new Types.ObjectId(String(userId))] } },
                    { createdBy: new Types.ObjectId(String(userId)) }
                ],
                bookingType: BookingType.Homestay
            }
        },
        {
            $lookup: {
                from: 'Homestay',
                localField: 'bookingDetails.ifHomeStayBooked.homestayId',
                foreignField: '_id',
                as: 'homestayDetails'
            }
        },
        {
            $unwind: {
                path: '$homestayDetails',
                preserveNullAndEmptyArrays: true
            }
        },
    ]);

    if (!bookings) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "No bookings found",
            }
        });
        return;
    }

    res.status(200).json({
        data: bookings,
        Status: {
            Code: 200,
            Message: "Homestay bookings retrieved successfully"
        }
    });
};
