import { prisma } from "../../prisma.config.ts";

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("DB Connected via Prisma");
    } catch (error) {
        console.error(`DB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    try {
        await prisma.$disconnect();
        console.log("DB Disconnected");
    } catch (error) {
        console.error(`DB Disconnect Error: ${error.message}`);
    }
};

export { connectDB, disconnectDB, prisma };