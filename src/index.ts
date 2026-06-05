import app from "./app";
import { connectDB } from "@/config/mongo";

const PORT = Number(process.env.PORT) || 8000;
const MONGO_URI = process.env.MONGO_URI || "";

connectDB(MONGO_URI).catch((err) => {
  console.error(err);
  process.exit(1);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
