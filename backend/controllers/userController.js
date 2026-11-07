import TryCatch from "../middlewares/try-catch.js";
import sanitize from "mongo-sanitize";
import { registerSchema, loginSchema, otpSchema } from "../config/zod.js";
import { redisClient } from "../index.js";
import { userModel } from "../models/userModel.js";
import bcrypt from "bcrypt";
import { getVerifyEmailHtml, getOtpHtml } from "../config/html.js";
import crypto from "crypto";
import {
  generateAccessToken,
  generateToken,
  revokeRefreshToken,
  verifyRefreshToken,
} from "../config/generateToken.js";
import { sendMail } from "../config/sendMail.js";
import { request } from "http";
import { generateCSRFToken } from "../config/csfrMiddleware.js";

export const registerUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);
  // once request body has been sanitized, you compare it against the schema created by us.

  const validation = registerSchema.safeParse(sanitizedBody);
  //safeParse returns an object with different properties.
  //like so:
  // {
  //     success: true,
  //     data: {
  //         name: "Anshuman",
  //         email: "anshuman@gmail.com",
  //         password: "password123"
  //     }
  // }
  //Pure error handling below: (in case of malicious attempt.)
  if (!validation.success) {
    const zodError = validation.error;

    let firstErrorMessage = "validation faild";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "Validation Error",
        code: issue.code,
      }));

      firstErrorMessage = allErrors[0]?.message || "Validation Error";
    }

    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }

  const { name, email, password } = validation.data;

  const rateLimitKey = `register-rate-limit:${req.ip}:${email}`;

  if (await redisClient.get(rateLimitKey)) {
    return res.status(429).json({
      message: "Too many requests, try again later.",
    });
  }

  const existingUser = await userModel.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: "User already exists",
    });
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const verifyToken = crypto.randomBytes(32).toString("hex");

  const verifyKey = `verify:${verifyToken}`;

  const dataToStore = JSON.stringify({
    name,
    email,
    password: hashPassword,
  });

  await redisClient.set(verifyKey, dataToStore, { EX: 300 });
  // key, value, options

  const subject = "Verify your Email for Account Creation";
  const html = getVerifyEmailHtml({ email, token: verifyToken });

  await sendMail({ email, subject, html });

  const result = await redisClient.set(rateLimitKey, "true", {
    NX: true,
    EX: 60,
  });

  if (result !== "OK") {
    return res.status(429).json({
      message: "Too many requests, try again later.",
    });
  }
  res.json({
    message:
      "A verification link has been sent to your email address. Valid for 5 minutes.",
  });
});

export const verifyUser = TryCatch(async (req, res) => {
  const { token } = req.params;
  if (!token) {
    return res.status(400).json({
      message: "Verification token is required.",
    });
  }
  const verifyKey = `verify:${token}`;
  const userDataJson = await redisClient.get(verifyKey);

  if (!userDataJson) {
    return res.status(400).json({
      message: "Verification link is expired.",
    });
  }

  const userData = JSON.parse(userDataJson);

  //optional

  const existingUser = await userModel.findOne({ email: userData.email });

  if (existingUser) {
    return res.status(400).json({
      message: "User already exists",
    });
  }
  // optional ends.

  const newUser = await userModel.create({
    name: userData.name,
    email: userData.email,
    password: userData.password,
  });

  await redisClient.del(verifyKey);

  res.status(201).json({
    message: "Email verified successfully. Account created.",
    user: { _id: newUser._id, name: newUser.name, email: newUser.email },
  });
});

export const loginUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);
  const validation = loginSchema.safeParse(sanitizedBody);

  if (!validation.success) {
    const zodError = validation.error;

    let firstErrorMessage = "validation faild";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "Validation Error",
        code: issue.code,
      }));

      firstErrorMessage = allErrors[0]?.message || "Validation Error";
    }

    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }

  const { email, password } = validation.data;

  const rateLimitKey = `login-rate-limit:${req.ip}:${email}`;

  if (await redisClient.get(rateLimitKey)) {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  const User = await userModel.findOne({ email });
  if (!User) {
    return res.status(400).json({
      message: "User doesn't exist or invalid credentials.",
    });
  }

  const comparePassword = await bcrypt.compare(password, User.password);
  if (!comparePassword) {
    return res.status(429).json({
      message: "Too many requests, try again later.",
    });
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  const otpKey = `otp:${email}`;

  await redisClient.set(otpKey, otp, { EX: 300 });

  const subject = "OTP for verification";
  const html = getOtpHtml({ email, otp });

  await sendMail({ email, subject, html });

  await redisClient.set(rateLimitKey, "true", { EX: 60 });

  res.json({
    message: "An OTP has been sent to your Email. Expires in 5 mins.",
  });
});

export const verifyOtp = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);

  const validation = otpSchema.safeParse(sanitizedBody);

  if (!validation.success) {
    const zodError = validation.error;

    let firstErrorMessage = "validation faild";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "Validation Error",
        code: issue.code,
      }));

      firstErrorMessage = allErrors[0]?.message || "Validation Error";
    }

    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }

  const { email, otp } = validation.data;

  const otpKey = `otp:${email}`;

  const storedOtp = await redisClient.get(otpKey);

  if (!storedOtp) {
    return res.status(400).json({
      message: "otp expired",
    });
  }

  if (storedOtp !== otp) {
    return res.status(400).json({
      message: "Invalid OTP.",
    });
  }

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  const tokenData = await generateToken(user._id, res);

  res.status(200).json({
    message: `Welcome ${user.name}`,
    user,
    sessionInfo: {
      sessionId: tokenData.sessionId,
      loginTime: new Date().toISOString,
      csrfToken: tokenData.csrfToken,
    },
  });

  await redisClient.del(otpKey);

  res.status(200).json({
    message: `Welcome ${user.name}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

export const myProfile = TryCatch(async (req, res) => {
  const user = req.user;

  const sessionId = req.sessionId;

  const sessionData = await redisClient.get(`session:${sessionId}`);
  let sessionInfo = null;

  if (sessionData) {
    const parsedSession = JSON.parse(sessionData);
    sessionInfo = {
      sessionId,
      loginTime: parsedSession.createdAt,
      lastActivity: parsedSession.lastActivity,
    };
  }

  res.json({ user, sessionInfo });
});

export const refreshToken = TryCatch(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: "Invalid refresh token",
    });
  }

  const decode = await verifyRefreshToken(refreshToken);

  if (!decode) {
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.clearCookie("csrfToken");
    return res.status(401).json({
      message: "Session expired.",
    });
  }

  generateAccessToken(decode.id, decode.sessionId, res);

  res.status(200).json({
    message: "Token refreshed.",
  });
});

export const logoutUser = TryCatch(async (req, res) => {
  const userId = req.user._id;

  await revokeRefreshToken(userId);

  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");
  res.clearCookie("csrfToken");

  await redisClient.del(`user:${userId}`);

  res.json({
    message: "logged out successfully.",
  });
});

export const refreshCSRF = TryCatch(async (req, res) => {
  const userId = req.user._id;

  const newCSRFToken = await generateCSRFToken(userId, res);

  res.json({
    message: "CSRF token refreshed",
    csrfToken: newCSRFToken,
  });
});

export const adminController = TryCatch(async (req, res) => {
  res.json({
    message: "Hello, Admin",
  });
});
