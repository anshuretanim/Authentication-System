import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import userRoute from "./routes/userRoute.js";
import { createClient } from "redis";
import cors from "cors";

dotenv.config();
await connectDb();

const redisUrl = process.env.REDIS_URL
if(!redisUrl){
    console.log("Missing Redis URL.");
    process.exit(1);
}
export const redisClient = createClient({
    url: redisUrl,
});
redisClient.connect().then(() => console.log("Connected to Redis")).catch(console.error);


const app = express();
app.use(express.json());
//using routes
app.use("/api/v1", userRoute);
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"]
    })
);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
});