import jwt from "jsonwebtoken";
import { redisClient } from "../index.js";
import { generateCSRFToken, revokeCSRFTOKEN } from "./csfrMiddleware.js";
import crypto from "crypto";

export const generateToken = async(id, res) => {
    
    const sessionId = crypto.randomBytes(16).toString("hex");


    
    const accessToken = jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn: "1m",
    });

    const refreshToken = jwt.sign({id}, process.env.REFRESH_SECRET, {
        expiresIn: "7d",
    });

    const refreshTokenKey = `refresh_token:${id}`;
    const activeSessionKey = `active_session:${id}`;
    const sessionDataKey = `session:${sessionId}`;

    const existingSession = await redisClient.get(activeSessionKey)
    if(existingSession){
        await redisClient.del(`session:${existingSession}`);
        await redisClient.del(refreshToken);
    }

    const sessionData = {
        userId: id,
        sessionId,
        createdAt: new Date().toISOString(), 
        lastActivity: new Date().toISOString()
    };

    await redisClient.setEx(refreshTokenKey, 7*24*60*60, refreshToken); //7 days validity
    await redisClient.setEx(sessionDataKey, 7*24*60*60, JSON.stringify(sessionData));
    await redisClient.setEx(activeSessionKey, 7*24*60*60, sessionId);

    res.cookie("accessToken", accessToken, {
        httpOnly: true, //Prevents frontend JavaScript from reading the cookie through document.cookie.
        secure: true, //Tells the browser to send the cookie only over HTTPS connections.
        sameSite: "none", //Controls whether the browser sends the cookie with cross-site requests.
        maxAge: 1*60*1000, //Defines how long the cookie remains valid, in milliseconds.
    });

    res.cookie("refreshToken", refreshToken, {
        maxAge: 7*24*60*60*1000,
        httpOnly:  true,
        sameSite: "none",
        secure: "true"
    });

    const csrfToken = await generateCSRFToken(id, res);

    return { accessToken, refreshToken, csrfToken, sessionId};
};

export const verifyRefreshToken = async(refreshToken)=>{
    try{
        const decode = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
        const storedToken = await redisClient.get(`refresh_token:${decode.id}`);

        if(storedToken !== refreshToken){
            return null;
        }

        const activeSessionId = await redisClient.get(`active_session:${decode.id}`);
        if(activeSessionId !== decode.sessionId){
            return null;
        }

        const sessionData = await redisClient.get(`session:${decode.sessionId}`);

        if(!sessionData){
            return null;
        }

        const parsedSessionData = JSON.parse(sessionData)
        parsedSessionData.lastActivity = new Date().toISOString()

        await redisClient.setEx(`session:${decode.sessionId}`, 7*24*60*60,JSON.stringify(parsedSessionData));
        return decode;

    }catch(err){
        return null;
    }
};

export const generateAccessToken = (id,sessionId, res) => {
    const accessToken = jwt.sign({id, sessionId}, process.env.JWT_SECRET, {
        expiresIn: "1m"
    });

    res.cookie("accessToken", accessToken, {
        httpOnly: true, //Prevents frontend JavaScript from reading the cookie through document.cookie.
        secure: true, //Tells the browser to send the cookie only over HTTPS connections.
        sameSite: "strict", //Controls whether the browser sends the cookie with cross-site requests.
        maxAge: 1*60*1000, //Defines how long the cookie remains valid, in milliseconds.
    });
};

export const revokeRefreshToken = async(userId) => {
    const activeSessionId = await redisClient.get(`active_session:${userId}`);
    await redisClient.del(`refresh_token:${userId}`);
    await redisClient.del(`active_session:${userId}`);

    if(activeSessionId){
        await redisClient.del(`session:${activeSessionId}`);    
    }

    await revokeCSRFTOKEN(userId);
};

export const isSessionActive = async(userId, sessionId) => {
    const activeSessionId = await redisClient.get(`active_session:${userId}`);
    return activeSessionId === sessionId;
}