import express from "express";
import {register, login, logout} from '../controllers/authController.js'

const router = express.Router();

router.get("/", (req, res) => {
    res.json({ message: "Welcome to the auth API", user: req.user });
});
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;