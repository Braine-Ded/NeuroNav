import {prisma} from '../config/db.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/generateToken.js';

const register = async (req, res) => {
    const { name, email, password} = req.body;

    // Check if user alr exists
    const userExists = await prisma.user.findUnique({
        where: {email: email},
    });

    if (userExists){
        return res 
            .status(400)
            .json({error: "User with this email already exists."});
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user
    const user = await prisma.user.create({
        data: {
            name: name,
            email: email,
            password: hashedPassword,
        },
    });

    // Generate JWT token
    const token = generateToken(user.id, res);

    res.status(201).json({
        status: "success",
        data: {
            user:{
                id: user.id,
                name: name,
                email: email,
            },
        },
        token: token,
    });
};


const login = async (req, res) => {
    const { email, password} = req.body;

    // Check if user email exists in db
    const user = await prisma.user.findUnique({
        where: { email: email },
    });

    if (!user){
        return res
            .status(401)
            .json({error: "Invalid email"});
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if(!isPasswordValid){
        return res
            .status(401)
            .json({error: "Invalid email or password"});
    }

    // Generate JWT token
    const token = generateToken(user.id, res);

    res.status(201).json({
        status: "success",
        data: {
            user:{
                id: user.id,
                name: user.name,
                email: email,
            },
        },
        token: token,
    });
};

const logout = async (req, res) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({
        status: "success",
        message: "Loggged out successfully",
    });
};

export {register, login, logout};