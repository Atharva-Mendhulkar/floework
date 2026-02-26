import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return next(new AppError('Please provide name, email, and password', 400));
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return next(new AppError('User already exists', 400));
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        res.status(201).json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError('Please provide an email and password', 400));
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return next(new AppError('Invalid credentials', 401));
        }

        if (!user.password) {
            return next(new AppError(`Please login using your external provider (${user.provider})`, 400));
        }

        if (!(await bcrypt.compare(password, user.password))) {
            return next(new AppError('Invalid credentials', 401));
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // req.user will be populated by the protect middleware
        const user = await prisma.user.findUnique({
            where: { id: (req as any).user.id },
            select: { id: true, name: true, email: true, role: true }
        });

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};
