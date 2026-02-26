import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return next(new AppError('No Google ID token provided', 400));
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            return next(new AppError('Invalid Google token', 401));
        }

        const { sub: googleId, email, name } = payload;

        if (!email) {
            return next(new AppError('No email found in Google token', 400));
        }

        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            // Update auth provider info if it was previously local
            if (!user.providerId) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { provider: 'google', providerId: googleId }
                });
            }
        } else {
            // Create new Google user
            user = await prisma.user.create({
                data: {
                    email,
                    name: name || 'Google User',
                    provider: 'google',
                    providerId: googleId,
                }
            });
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
            }
        });
    } catch (error) {
        console.error("Google Auth Error: ", error);
        next(new AppError('Authentication failed via Google', 401));
    }
};

export const githubAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Scaffold for GitHub Auth.
        // The frontend sends a 'code' and this endpoint swaps it for an access token via the GitHub REST API.
        // For now, it returns a 501 until GitHub Client ID and Secrets are configured.
        next(new AppError('GitHub Auth not fully implemented yet.', 501));
    } catch (error) {
        next(error);
    }
};
