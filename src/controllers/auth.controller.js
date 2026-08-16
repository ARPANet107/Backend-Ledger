const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const emailService = require('../services/email.service');
const tokenBlackListModel = require('../models/blackList.model');

/**
 * 
 * - user register controller 
 * - POST /api/auth/register 
 */
async function userRegisterController(req, res) {
    const { email, password, name } = req.body;

    const exists = await userModel.findOne({
        email: email
    })

    if (exists) {
        return res.status(422).json({
            message: "user already exists with same email.",
            status: "failed"
        })
    }

    const user = await userModel.create({
        email, password, name
    })

    const token = jwt.sign({ user: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

    res.cookie("token", token);

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })

    await emailService.sendRegistrationEmail(user.email, user.name);


}

/**
 * - user login controller 
 * - POST /api/auth/login 
 */
async function userLoginController(req, res) {
    const { email, password } = req.body

    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
        return res.status(401).json({
            message: "Email or password does not exist"
        })
    }

    const isValidPass = await user.comparePassword(password);
    if (!isValidPass) {
        return res.status(401).json({
            message: "Email or password does not exist"
        })
    }


    const token = jwt.sign({ user: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

    res.cookie("token", token);

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name
        },
        token
    })

}

/**
 * - user logout controller 
 * - POST /api/auth/logout 
 */
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(200).json({
            message: "user logged out succesfully"
        })
    }

    await tokenBlackListModel.create({
        token: token
    })

        res.clearCookie("token");

    return res.status(200).json({
        message: "user logged out succesfully"
    })
}


module.exports = { userRegisterController, userLoginController, userLogoutController }