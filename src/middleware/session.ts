import { NextFunction, Request, Response } from "express";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import User from "@/schemas/User";
dotenv.config({ path: ".env" });
// JWT auth middleware (register before mainRoutes)
const JWT_SECRET = process.env.JWT_SECRET?.trim();
const JWT_ISSUER = process.env.JWT_ISSUER?.trim();
const JWT_AUDIENCE = process.env.JWT_AUDIENCE?.trim();

function getToken(req: Request): string | undefined {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = Object.fromEntries(
            cookieHeader.split(";").map((c) => {
                const [k, v] = c.trim().split("=");
                return [decodeURIComponent(k), decodeURIComponent(v ?? "")];
            })
        );

        return cookies["access_token"] || cookies["token"];
    }

    return undefined;
}

const jwtAuthMiddleware = async(req: Request, res: Response, next: NextFunction) => {
    if (req.method === "OPTIONS") return next();

    if (!JWT_SECRET) {
        res.status(500).json({ error: "Server misconfiguration" });
        return;
    }

    const token = getToken(req);
    if (!token) {
        res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token", error_description="Missing token"');
        res.status(401).json({ error: "Missing token" });
        return;
    }

    try {
        const decoded = jsonwebtoken.verify(token, JWT_SECRET, {
            algorithms: ["HS256"],
            issuer: JWT_ISSUER || undefined,
            audience: JWT_AUDIENCE || undefined,
            clockTolerance: 5,
        }) as jsonwebtoken.JwtPayload & { userId?: string; id?: string; sub?: string };

        const userId = decoded.userId || decoded.sub || decoded.id;
        
        const user = await User.findById(userId).lean();

        console.log("Authenticated user:", user);

        if (!user) {
            res.status(401).json({
                data: null,
                Status: {
                    Code: 401,
                    Message: "User not found"
                }
            });
            return;
        }

        if(user.token !== token){
            res.status(401).json({ 
                data: null,
                Status: {
                    Code: 401,
                    Message: "Logged in from another device"
                }
             });
            return;
        }

        const otp = decoded.otp;
        if (!userId || typeof userId !== "string") {
            res.status(401).json({ error: "Invalid token payload" });
            return;
        }

        req.user = { userId, otp };
        next();
    } catch (err: any) {
        const name = err?.name;
        const msg =
            name === "TokenExpiredError" ? "Token expired" :
                name === "JsonWebTokenError" ? "Invalid token" :
                    "Unauthorized";

        res.setHeader('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"');
        res.status(401).json({ error: msg });
    }
};

export default jwtAuthMiddleware;