import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';

// For development purposes, we create a simple register/login placeholder
// before full JWT authentication is implemented in the next phase.

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        next(error);
    }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, name: true, email: true, role: true, teams: true },
        });

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return next(new AppError('Email already in use', 400));
        }

        // Note: Password should be hashed in production using bcryptjs
        const user = await prisma.user.create({
            data: { name, email, password },
            select: { id: true, name: true, email: true, role: true },
        });

        res.status(201).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { name, email, password } = req.body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, email: true, role: true },
        });

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};
