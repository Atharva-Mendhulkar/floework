import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const createTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description } = req.body;
        const userId = (req as any).user.id;

        if (!name) {
            return next(new AppError('Team name is required', 400));
        }

        const team = await prisma.team.create({
            data: {
                name,
                description,
                members: {
                    create: {
                        userId,
                        teamRole: 'ADMIN', // The creator is automatically the admin
                    }
                }
            },
            include: {
                members: true
            }
        });

        res.status(201).json({ success: true, data: team });
    } catch (error) {
        next(error);
    }
};

export const getMyTeams = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;

        const teams = await prisma.team.findMany({
            where: {
                members: {
                    some: { userId }
                }
            },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, email: true } } }
                }
            }
        });

        res.json({ success: true, data: teams });
    } catch (error) {
        next(error);
    }
};

export const inviteMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId } = req.params;
        const { email, role = 'MEMBER' } = req.body;
        const inviterId = (req as any).user.id;

        if (!email) {
            return next(new AppError('Email is required to invite a member', 400));
        }

        // Verify inviter is an ADMIN of the team
        const inviterMembership = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId: inviterId, teamId } }
        });

        if (!inviterMembership || inviterMembership.teamRole !== 'ADMIN') {
            return next(new AppError('You do not have permission to invite members to this team', 403));
        }

        // Find the user by email
        const userToInvite = await prisma.user.findUnique({ where: { email } });
        if (!userToInvite) {
            return next(new AppError('No user found with that email address. They must register first.', 404));
        }

        // Check if already in the team
        const existingMember = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId: userToInvite.id, teamId } }
        });

        if (existingMember) {
            return next(new AppError('User is already a member of this team', 400));
        }

        // Create membership
        const newMember = await prisma.teamMember.create({
            data: {
                userId: userToInvite.id,
                teamId,
                teamRole: role.toUpperCase()
            },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        });

        res.json({ success: true, data: newMember });
    } catch (error) {
        next(error);
    }
};

export const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId, userId } = req.params;
        const { role } = req.body;
        const requesterId = (req as any).user.id;

        if (!role || !['ADMIN', 'MEMBER'].includes(role.toUpperCase())) {
            return next(new AppError('Invalid role specified', 400));
        }

        // Verify requester is an ADMIN
        const requesterMembership = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId: requesterId, teamId } }
        });

        if (!requesterMembership || requesterMembership.teamRole !== 'ADMIN') {
            return next(new AppError('You do not have permission to change roles', 403));
        }

        const updatedMember = await prisma.teamMember.update({
            where: { userId_teamId: { userId, teamId } },
            data: { teamRole: role.toUpperCase() },
            include: { user: { select: { id: true, name: true, email: true } } }
        });

        res.json({ success: true, data: updatedMember });
    } catch (error) {
        if ((error as any).code === 'P2025') {
            return next(new AppError('Member not found in this team', 404));
        }
        next(error);
    }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { teamId, userId } = req.params;
        const requesterId = (req as any).user.id;

        // Verify requester is an ADMIN (or they are leaving the team themselves)
        if (requesterId !== userId) {
            const requesterMembership = await prisma.teamMember.findUnique({
                where: { userId_teamId: { userId: requesterId, teamId } }
            });

            if (!requesterMembership || requesterMembership.teamRole !== 'ADMIN') {
                return next(new AppError('You do not have permission to remove members', 403));
            }
        }

        await prisma.teamMember.delete({
            where: { userId_teamId: { userId, teamId } }
        });

        res.json({ success: true, message: 'Member successfully removed or left team' });
    } catch (error) {
        if ((error as any).code === 'P2025') {
            return next(new AppError('Member not found in this team', 404));
        }
        next(error);
    }
};
