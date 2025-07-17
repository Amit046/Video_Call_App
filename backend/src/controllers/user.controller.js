import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Meeting } from "../models/meeting.model.js";
import { body, validationResult } from "express-validator";

// Validation middleware
export const validateRegister = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.[a-z])(?=.[A-Z])(?=.\d)(?=.[@$!%?&])[A-Za-z\d@$!%?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

export const validateLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Helper function to generate JWT token
const generateToken = (userId, username) => {
    return jwt.sign(
        { userId, username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Helper function to verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
        return null;
    }
};

// Enhanced login with rate limiting consideration
const login = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }

        const { username, password } = req.body;

        // Find user and include password field
        const user = await User.findOne({ username }).select('+password');
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Check if account is locked (if you implement account locking)
        if (user.isLocked) {
            return res.status(httpStatus.LOCKED).json({
                success: false,
                message: "Account temporarily locked due to too many failed attempts"
            });
        }

        // Compare password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            // Increment login attempts (if implemented)
            if (user.incLoginAttempts) {
                await user.incLoginAttempts();
            }
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Reset login attempts on successful login
        if (user.resetLoginAttempts) {
            await user.resetLoginAttempts();
        }

        // Generate JWT token
        const token = generateToken(user._id, user.username);

        // Update last login
        if (user.updateLastLogin) {
            await user.updateLastLogin();
        } else {
            user.lastLogin = new Date();
            await user.save();
        }

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(httpStatus.OK).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: userResponse
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Enhanced register with better validation
const register = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }

        const { name, username, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({
                success: false,
                message: "Username already exists"
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            name: name.trim(),
            username: username.trim(),
            password: hashedPassword
        });

        await newUser.save();

        // Generate token for immediate login
        const token = generateToken(newUser._id, newUser.username);

        // Remove password from response
        const userResponse = newUser.toObject();
        delete userResponse.password;

        return res.status(httpStatus.CREATED).json({
            success: true,
            message: "User registered successfully",
            data: {
                token,
                user: userResponse
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(httpStatus.CONFLICT).json({
                success: false,
                message: "Username already exists"
            });
        }

        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Enhanced getUserHistory with JWT authentication
const getUserHistory = async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Token is required"
            });
        }

        // Verify JWT token
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Find user by decoded token info
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
        }

        // Get meetings with pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const meetings = await Meeting.find({ user_id: user.username })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Meeting.countDocuments({ user_id: user.username });

        return res.status(httpStatus.OK).json({
            success: true,
            data: {
                meetings,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get user history error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Enhanced addToHistory with better validation
const addToHistory = async (req, res) => {
    try {
        const { token, meeting_code } = req.body;

        // Validate required fields
        if (!token || !meeting_code) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Token and meeting code are required"
            });
        }

        // Verify JWT token
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        // Find user
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if meeting already exists for this user
        const existingMeeting = await Meeting.findOne({
            user_id: user.username,
            meetingCode: meeting_code
        });

        if (existingMeeting) {
            return res.status(httpStatus.CONFLICT).json({
                success: false,
                message: "Meeting already exists in history"
            });
        }

        // Create new meeting
        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code,
            createdAt: new Date()
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            success: true,
            message: "Meeting added to history successfully",
            data: newMeeting
        });

    } catch (error) {
        console.error('Add to history error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Middleware to authenticate JWT token
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: "Access token is required"
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(httpStatus.FORBIDDEN).json({
            success: false,
            message: "Invalid or expired token"
        });
    }

    req.user = decoded;
    next();
};

// Logout function to invalidate token (if using token blacklist)
const logout = async (req, res) => {
    try {
        // In a real application, you might want to blacklist the token
        // or remove it from a whitelist in Redis/database
        
        return res.status(httpStatus.OK).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// Get user profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(httpStatus.OK).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export { 
    login, 
    register, 
    getUserHistory, 
    addToHistory, 
    logout, 
    getProfile 
};
