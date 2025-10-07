import Transaction from "@/schemas/Transaction";
import User from "@/schemas/User";
import { DefaultResponseBody } from "@/types/default";
import { IUser, UserRole } from "@/types/user";
import { Request, Response } from "express";
import { Types } from "mongoose";

export const getUser = async (
    req: Request<{}, {}, {}, Partial<IUser>>,
    res: Response<DefaultResponseBody<IUser>>
) => {
    const { phone, email, status, fullname } = req.query;
    const accessById = req.user?.userId;

    const filters: Record<string, unknown> = {};

    if (phone) filters.phone = new RegExp(phone as string, "i");
    if (fullname) filters.fullname = new RegExp(fullname as string, "i");
    if (email) filters.email = new RegExp(email as string, "i");
    if (status) filters.status = status;

    const accessBy = await User.findOne({ _id: new Types.ObjectId(accessById) }).lean();

    if (!accessBy) {
        res.status(403).json({
            data: null,
            Status: {
                Code: 403,
                Message: "Access denied: unable to verify requester identity."
            }
        });

        return
    }

    const query = Object.keys(filters).length ? filters : { _id: accessBy._id };
    const user = await User.findOne(query);

    if (!user) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "User not found."
            }
        });
        return;
    }

    if (accessBy?.userRole == UserRole.SADMIN || user?._id?.toString() == accessBy._id?.toString()) {
        res.status(200).json({
            data: user,
            Status: {
                Code: 200,
                Message: "User found"
            }
        });

        return;

    } else {
        res.status(403).json({
            data: null,
            Status: {
                Code: 403,
                Message: "You do not have permission to perform this action."
            }
        });

        return;
    }

}

export const getUsers = async (
    req: Request<{}, {}, Partial<IUser>>,
    res: Response<DefaultResponseBody<IUser[]>>
) => {
    const { userId, phone, email, status, searchBy } = req.query;
    const filters: Record<string, unknown> = {};

    if (userId) filters.userId = new Types.ObjectId(userId as string);
    if (phone) filters.phone = new RegExp(phone as string, "i");
    if (email) filters.email = new RegExp(email as string, "i");
    if (status) filters.status = status;
    if (searchBy) filters.$text = { $search: searchBy };

    const users = await User.find(filters);

    res.status(200).json({
        data: users,
        Status: {
            Code: 200,
            Message: "Users found"
        }
    });
}

export const createUser = async (
    req: Request<{}, {}, Partial<IUser>>,
    res: Response<DefaultResponseBody<IUser>>
) => {
    const { fullname, email, phone, gstDetails } = req.body;
    const createdBy = req.user?.userId;

    if (!createdBy) {
        res.status(401).json({
            data: null,
            Status: {
                Code: 401,
                Message: "Unauthorized"
            }
        });
        return;
    }

    const newUser = new User({
        fullname,
        email,
        phone,
        gstDetails,
        createdBy
    });

    await newUser.save();

    res.status(201).json({
        data: newUser,
        Status: {
            Code: 201,
            Message: "User created successfully"
        }
    });
}

export const getUserByCompanyId = async (
    req: Request<any, any, any, Partial<IUser>>,
    res: Response<DefaultResponseBody<IUser[]>>
) => {
    const query = req.query;
    const filter: Record<string, unknown> = {}

    if (query.fullname) filter['fullname'] = new RegExp(query.fullname as string, "i");
    if (query.email) filter['email'] = new RegExp(query.email as string, "i");
    if (query.phone) filter['phone'] = new RegExp(query.phone as string, "i");
    if (query.status) filter['status'] = query.status;

    console.log("Query parameters:", query);
    console.log("Filter constructed:", filter);

    const accessById = req.user?.userId;

    console.log("AccessById:", accessById);

    if (!accessById) {
        res.status(401).json({
            data: null,
            Status: {
                Code: 401,
                Message: "Unauthorized"
            }
        });
        return;
    }

    const user = await User.find({
        companyId: new Types.ObjectId(accessById),
        ...filter
    }).lean();

    console.log("User found:", user);

    if (!user) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "User not found"
            }
        });
        return;
    }

    res.status(200).json({
        data: user,
        Status: {
            Code: 200,
            Message: "User found"
        }
    });
}

export const updateUsers = async (
    req: Request<{}, {}, Partial<IUser>>,
    res: Response<DefaultResponseBody<IUser[]>>
) => {
    const { _id, phone, email, status } = req.body;
    const updatedBy = req.user?.userId;

    if (!updatedBy) {
        res.status(401).json({
            data: null,
            Status: {
                Code: 401,
                Message: "Unauthorized: 'updatedBy' information is missing."
            }
        });
        return;
    }

    const filters: Record<string, unknown> = {};

    if(_id && !Types.ObjectId.isValid(_id as string)) {
        res.status(400).json({
            data: null,
            Status: {   
                Code: 400,
                Message: "Invalid user ID format."
            }
        });
        return;
    }
    if (_id) filters._id = new Types.ObjectId(_id as string);
    if (phone) filters.phone = new RegExp(phone as string, "i");
    if (email) filters.email = new RegExp(email as string, "i");
    if (status) filters.status = status;


    const superadmins = await User.find({ userRole: UserRole.SADMIN });
    const self = await User.findOne({ _id: new Types.ObjectId(updatedBy) });

    if (!Types.ObjectId.isValid(updatedBy)) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Invalid 'updatedBy' ID."
            }
        });
        return;
    }

    const isSuperAdmin = superadmins.some(i => i._id?.toString() === updatedBy);
    if (isSuperAdmin) {
        // If the user is a super admin, allow the update
        await User.updateOne(filters, { $set: req.body });
    } else if (self?._id?.toString() === updatedBy) {
        // Disallow non-super admins from changing the userRole
        if (Object.prototype.hasOwnProperty.call(req.body, "userRole") || Object.prototype.hasOwnProperty.call(req.body, "userStatus") || Object.prototype.hasOwnProperty.call(req.body, "wallet")) {
            res.status(403).json({
                data: null,
                Status: {
                    Code: 403,
                    Message: "Only super admins can change user roles."
                }
            });
            return;
        }
        await User.updateMany(filters, { $set: req.body });
    } else {
        res.status(403).json({
            data: null,
            Status: {
                Code: 403,
                Message: "You do not have permission to perform this action."
            }
        });
        return;
    }


    res.status(200).json({
        data: null,
        Status: {
            Code: 200,
            Message: "Users updated"
        }
    });
}

export const updateSelfWallet = async (
    req: Request<{}, {}, { amount: number; operation: 'credit' | 'debit' }>,
    res: Response<DefaultResponseBody<IUser>>
) => {
    const { amount, operation } = req.body;
    const userId = req.user?.userId;

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

    if (amount <= 0) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Amount must be greater than zero"
            }
        });
        return;
    }

    const user = await User.findOne({ _id: new Types.ObjectId(userId) });

    if (!user) {
        res.status(404).json({
            data: null,
            Status: {
                Code: 404,
                Message: "User not found"
            }
        });
        return;
    }

    if (user.wallet && operation === 'debit' && user.wallet < amount) {
        res.status(400).json({
            data: null,
            Status: {
                Code: 400,
                Message: "Insufficient wallet balance"
            }
        });
        return;
    }

    const updatedWallet = operation === 'credit' ? (user.wallet || 0) + amount : (user.wallet || 0) - amount;

    user.wallet = updatedWallet;

    const transaction = await Transaction.create({
        userId: user._id,
        amount,
        operation
    });

    await user.save();

    res.status(200).json({
        data: user,
        Status: {
            Code: 200,
            Message: "Wallet updated successfully"
        }
    });
}
