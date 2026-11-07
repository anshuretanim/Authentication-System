import jwt from "jsonwebtoken";
import redisClient from "../index.js";
import { userModel } from "../models/userModel.js";
import { isSessionActive } from "../config/generateToken.js";

export const isAuth = async(req, res, next)=>{
    try{
        const token = req.cookies.accessToken;
        if(!token){
            return res.status(403).json({
                message: "Please Login - no token"
            });
        }
        const decodedData = jwt.verify(token.process.env.JWT_SECRET);

        if(!decodedData){
            return res.status(400).json({
                message: "token expired"
            });
        }

        const sessionActive = await isSessionActive(
            decodedData.id,
            decodedData.sessionId
        );

        if(!sessionActive){
            res.clearCookie("refreshToken");
            res.clearCookie("accessToken");
            res.clearCookie("csrfToken");

            return res.status(401).json({
                message: "Session Expired. You have been logged in from another device."
            });
        }

        const cacheUser = await redisClient.get(`user:${decodedData.id}`);

        if(cacheUser){
            req.user = JSON.parse(cacheUser);
            req.sessionId = decodedData.sessionId;
            return next();
        }

        const user = await userModel.findById(decodedData.id).select("-password");

        if(!user){
            return res.status(400).json({
                message: "No user with this ID."
            });
        }

        await redisClient.setEx(`user:${user._id}`, 3600, JSON.stringify(user));

        req.user = user;
        req.sessionId = decodedData.sessionId;
        next();

    }catch(err){
        res.status(500).json({
            message: err.message
        });
    }
};

export const authorizedAdmin = async(req,res,next)=>{
    const user=  req.user;
    if(user.role !== "admin"){
        return res.status(401).json({
            message: "Non-admins are not allowed for this activity."
        });
    }
    next();
}