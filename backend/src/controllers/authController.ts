import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import axios from 'axios';
import { encrypt } from '../utils/crypto';
import { google } from 'googleapis';
import { gcalSyncQueue } from '../workers/gcalSync';
import { seedSampleWorkspace } from '../services/seedSampleWorkspace';

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
            select: { 
                id: true, 
                name: true, 
                email: true, 
                role: true,
                weeklyReportEnabled: true
            }
        });

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        let gitHubConnection = null;
        try {
            gitHubConnection = await (prisma as any).gitHubConnection.findUnique({ where: { userId: user.id } });
        } catch (e) {}

        res.json({ success: true, data: { ...user, gitHubConnection: gitHubConnection ? { githubLogin: gitHubConnection.githubLogin } : null } });
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/github?token=...
export const connectGitHub = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(401).send('Authentication token required');

        // Verify token to get userId
        let decoded: any;
        try {
            decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'secret');
        } catch (err) {
            return res.status(401).send('Invalid token');
        }

        const stateToken = jwt.sign({ userId: decoded.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
        
        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID || '',
            redirect_uri: process.env.GITHUB_CALLBACK_URL || '',
            scope: 'repo read:user',
            state: stateToken
        });

        res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/github/callback
export const githubCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code, state } = req.query;
        if (!code || !state) return res.status(400).send('Missing code or state');

        // Verify state to get userId
        let decoded: any;
        try {
            decoded = jwt.verify(state as string, process.env.JWT_SECRET || 'secret');
        } catch (err) {
            return res.status(400).send('Invalid state token');
        }

        const userId = decoded.userId;

        // Exchange code for access token
        const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: process.env.GITHUB_CALLBACK_URL,
        }, {
            headers: { Accept: 'application/json' }
        });

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) throw new Error('Failed to obtain access token');

        // Get user profile to get githubLogin
        const userRes = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const githubLogin = userRes.data.login;
        const encryptedToken = encrypt(accessToken);

        // Upsert GitHubConnection
        await (prisma as any).gitHubConnection.upsert({
            where: { userId },
            update: {
                githubLogin,
                accessToken: encryptedToken,
                scopes: tokenRes.data.scope || 'repo,read:user',
            },
            create: {
                userId,
                githubLogin,
                accessToken: encryptedToken,
                scopes: tokenRes.data.scope || 'repo,read:user',
            }
        });

        res.send(`<script>window.opener.postMessage('github:connected', '*'); window.close();</script>`);
    } catch (error) {
        console.error('GitHub OAuth Error:', error);
        res.status(500).send('OAuth failed');
    }
};

// DELETE /api/auth/github
export const disconnectGitHub = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        
        await (prisma as any).gitHubConnection.deleteMany({
            where: { userId }
        });
        
        // Note: Full app revocation requires basic auth to GitHub app endpoints,
        // which is complex. For this prototype, we just delete the connection record locally.
        
        res.json({ success: true, message: 'Disconnected' });
    } catch (error) {
        next(error);
    }
};

export const connectGoogleCalendar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(401).send('Authentication token required');

        let decoded: any;
        try {
            decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'secret');
        } catch (err) {
            return res.status(401).send('Invalid token');
        }

        const stateToken = jwt.sign({ userId: decoded.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
        
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/v1/auth/google-calendar/callback'
        );

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email'],
            state: stateToken,
            prompt: 'consent'
        });

        res.redirect(url);
    } catch (error) {
        next(error);
    }
};

export const googleCalendarCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code, state } = req.query;
        if (!code || !state) return res.status(400).send('Missing code or state');

        let decoded: any;
        try {
            decoded = jwt.verify(state as string, process.env.JWT_SECRET || 'secret');
        } catch (err) {
            return res.status(400).send('Invalid state token');
        }

        const userId = decoded.userId;

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/v1/auth/google-calendar/callback'
        );

        const { tokens } = await oauth2Client.getToken(code as string);
        
        const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
        oauth2Client.setCredentials(tokens);
        const userInfo = await oauth2.userinfo.get();
        const googleEmail = userInfo.data.email || '';

        const connection = await (prisma as any).googleCalendarConnection.findUnique({ where: { userId } });
        const refreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : (connection?.refreshToken || '');

        await (prisma as any).googleCalendarConnection.upsert({
            where: { userId },
            update: {
                googleEmail,
                accessToken: encrypt(tokens.access_token!),
                refreshToken,
            },
            create: {
                userId,
                googleEmail,
                accessToken: encrypt(tokens.access_token!),
                refreshToken,
            }
        });

        await gcalSyncQueue.add('sync', { userId });

        res.send(`<script>window.opener.postMessage('gcal:connected', '*'); window.close();</script>`);
    } catch (error) {
        console.error('Google Calendar OAuth Error:', error);
        res.status(500).send('OAuth failed');
    }
};

export const disconnectGoogleCalendar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        
        await (prisma as any).googleCalendarConnection.deleteMany({ where: { userId } });
        await (prisma as any).focusCalendarEvent.deleteMany({ where: { userId } });
        
        res.json({ success: true, message: 'Disconnected' });
    } catch (error) {
        next(error);
    }
};

export const getGoogleCalendarStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const connection = await (prisma as any).googleCalendarConnection.findUnique({ where: { userId } });
        
        if (!connection) {
            return res.json({ success: true, data: { connected: false, googleEmail: null, lastSynced: null } });
        }
        
        
        res.json({ success: true, data: { connected: true, googleEmail: connection.googleEmail, lastSynced: connection.lastSynced } });
    } catch (error) {
        next(error);
    }
};

export const setupWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { projectName, sprintName, useSandbox } = req.body;

        if (useSandbox) {
            const team = await prisma.team.create({ data: { name: 'Personal Workspace' } });
            await prisma.teamMember.create({ data: { teamId: team.id, userId, teamRole: 'ADMIN' } });
            const project = await prisma.project.create({ data: { name: 'My First Project', description: 'Default project to get started', teamId: team.id } });
            await seedSampleWorkspace(userId, project.id);
            return res.status(201).json({ success: true, message: 'Sandbox workspace created successfully' });
        }

        if (!projectName || !sprintName) {
            return next(new AppError('Please provide projectName and sprintName for custom workspace setup', 400));
        }

        const team = await prisma.team.create({ data: { name: projectName } });
        await prisma.teamMember.create({ data: { teamId: team.id, userId, teamRole: 'ADMIN' } });
        const project = await prisma.project.create({ data: { name: projectName, description: 'Custom workspace', teamId: team.id } });
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14);

        const sprint = await prisma.sprint.create({
            data: {
                name: sprintName,
                projectId: project.id,
                startDate,
                endDate,
                status: 'ACTIVE'
            }
        });

        res.status(201).json({ success: true, data: { team, project, sprint } });
    } catch (error) {
        next(error);
    }
};
