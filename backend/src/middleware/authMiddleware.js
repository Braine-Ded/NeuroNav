import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

// Read the token from the request header
// Verify the token and extract the user information
export const authMiddleware = async (req, res, next) => {
    console.log("Auth middleware called");

    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
        // format ['Bearer' 'actual_token_value']
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookie?.jwt){
        token = req.cookie.jwt;
    }

    if (!token){
        return res.status(401).json({error: "Unothorized access denied. No token provided."});
    }

    try {
        // Verify token and extrct user id
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user){
            return res.status(401).json({error: "User no longer exists"});
        }

        req.user = user;
        req.body.userId = user.id;

        console.log(`Authenticated user: ${req.user.email} (ID: ${req.body.userId})`);
        
        next();
    } catch (err){
        return res.status(401).json({error: "Not authorized, token failed."})
    }

};