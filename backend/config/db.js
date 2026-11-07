import mongoose from "mongoose";

const connectDb = async() => {
    try{
        await mongoose.connect(process.env.MONGO_URI, 
            {
                dbName: "Mern Authentication"
            });
            console.log("MongoDB connected.");
    }catch(err){
        console.log("Failed to connect. Error: ", err);
    }
}

export default connectDb