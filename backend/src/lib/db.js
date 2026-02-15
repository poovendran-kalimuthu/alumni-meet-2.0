import mongoose from 'mongoose';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log(`Database is connected to the host : ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }    
}