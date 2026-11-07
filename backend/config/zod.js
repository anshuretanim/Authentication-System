import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().min(3, "Name must be atleast 3 characters."),
    email: z.email("Invalid E-mail format."),
    password: z.string().min(8, "Password must be at least 8 characters.")
});

//describes what valid registration data should look like.
// the 'z.object' tells Zod that I'm expecting an object containing name, email, and password, and each property must follow these rules.

//Zod is a JavaScript/TypeScript library used for data validation.
//It allows you to define rules for what data should look like and 
//then check whether actual data follows those rules.
//z is an exported object from that package.


export const loginSchema = z.object({
    email: z.email("Invalid E-mail format."),
    password: z.string().min(8, "Password must be at least 8 characters.")
});

export const otpSchema = z.object({
    otp: z.string().length(6, "OTP must be exactly 6 digits")
        .regex(/^\d+$/, "OTP must contain only digits"),
     email: z.email()    
});