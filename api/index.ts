import "module-alias/register";
import type { NextFunction, Request, Response } from "express";
import app from "../dist/app";
import { connectDB } from "../dist/config/mongo";

const MONGO_URI = process.env.MONGO_URI || "";
let dbReady: Promise<unknown> | null = null;

function ensureDb(): Promise<unknown> {
  if (!dbReady) {
    dbReady = connectDB(MONGO_URI);
  }
  return dbReady;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  void ensureDb()
    .then(() => next())
    .catch(next);
});

export default app;
