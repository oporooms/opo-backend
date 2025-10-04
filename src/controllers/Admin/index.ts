import Booking from "@/schemas/Booking";
import User from "@/schemas/User";
import { BookingStatus, CompanyApproval } from "@/types/Bookings";
import { DefaultResponseBody } from "@/types/default";
import { UserRole } from "@/types/user";
import { Request, Response } from "express";
import { Types } from "mongoose";

export const dashboardHandler = async (
    req: Request<any, any, any, any>,
    res: Response<DefaultResponseBody<{
        totalBookings: number;
        increasedBookings: {
            thisWeek: number;
            previousWeek: number;
            value: number;
            percent: number;
        },
        totalRevenue: number,
        pendingCompanyApprovals: number,
        pendingStatus: number
    }>>
) => {
    const accessBy = req.user?.userId

    if (!accessBy || !Types.ObjectId.isValid(accessBy)) {
        res.status(401).json({
            data: null,
            Status: {
                Code: 401,
                Message: "Unauthorized"
            }
        })

        return
    }

    const user = await User.findById(accessBy)

    if (!user || user.userRole == UserRole.USER) {
        res.status(401).json({
            data: null,
            Status: {
                Code: 401,
                Message: "Unauthorized"
            }
        })

        return
    }

    const totalBookings = await Booking.countDocuments({
        $or: [
            { userId: { $in: [new Types.ObjectId(accessBy)] } },
            { createdBy: new Types.ObjectId(accessBy) }
        ]
    })

    const getWeeklyIncrease = async (accessId: string) => {
        const id = new Types.ObjectId(accessId)
        const now = new Date()
        const day = now.getDay()
        const diffToMonday = (day + 6) % 7

        const startOfCurrentWeek = new Date(now)
        startOfCurrentWeek.setDate(now.getDate() - diffToMonday)
        startOfCurrentWeek.setHours(0, 0, 0, 0)

        const endOfCurrentWeek = new Date(startOfCurrentWeek)
        endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 7)
        endOfCurrentWeek.setHours(0, 0, 0, 0)

        const startOfPreviousWeek = new Date(startOfCurrentWeek)
        startOfPreviousWeek.setDate(startOfCurrentWeek.getDate() - 7)
        startOfPreviousWeek.setHours(0, 0, 0, 0)

        const baseFilter: any = {
            $or: [{ userId: { $in: [id] } }, { createdBy: id }]
        }

        const [thisWeekCount, previousWeekCount] = await Promise.all([
            Booking.countDocuments({
                ...baseFilter,
                createdAt: { $gte: startOfCurrentWeek, $lt: endOfCurrentWeek }
            }),
            Booking.countDocuments({
                ...baseFilter,
                createdAt: { $gte: startOfPreviousWeek, $lt: startOfCurrentWeek }
            })
        ])

        const value = thisWeekCount - previousWeekCount
        const percent =
            previousWeekCount === 0
                ? thisWeekCount === 0
                    ? 0
                    : 100
                : Math.round((value / previousWeekCount) * 10000) / 100

        return {
            thisWeek: thisWeekCount,
            previousWeek: previousWeekCount,
            value,
            percent
        }
    }

    const totalRevenueAgg = await Booking.aggregate([
        {
            $match: {
                $or: [
                    { userId: { $in: [new Types.ObjectId(accessBy)] } },
                    { createdBy: new Types.ObjectId(accessBy) }
                ]
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: { $ifNull: ["$payment.total", 0] } }
            }
        }
    ])

    const pendingCompanyApprovals = await Booking.countDocuments({
        $or: [
            { userId: { $in: [new Types.ObjectId(accessBy)] } },
            { createdBy: new Types.ObjectId(accessBy) }
        ],
        "bookingDetails.companyApproval": CompanyApproval.Pending
    })

    const pendingStatus = await Booking.countDocuments({
        $or: [
            { userId: { $in: [new Types.ObjectId(accessBy)] } },
            { createdBy: new Types.ObjectId(accessBy) }
        ],
        status: BookingStatus.PENDING
    })

    const totalRevenue = (totalRevenueAgg[0]?.total ?? 0) as number
    const increasedBookings = await getWeeklyIncrease(accessBy)

    res.status(200).json({
        data: {
            totalBookings,
            increasedBookings,
            totalRevenue,
            pendingCompanyApprovals,
            pendingStatus
        },
        Status: {
            Code: 200,
            Message: "Success"
        }
    })
}