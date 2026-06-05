import "module-alias/register";
import app from "../dist/app";
import { connectDB } from "../dist/config/mongo";

const MONGO_URI = process.env.MONGO_URI || "";
let dbReady: Promise<unknown> | null = null;

function ensureDb() {
  if (!dbReady) {
    dbReady = connectDB(MONGO_URI);
  }
  return dbReady;
}

app.use((req, res, next) => {
  ensureDb()
    .then(() => next())
    .catch(next);
});

export default app;
