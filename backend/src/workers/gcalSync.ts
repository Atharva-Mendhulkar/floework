import { Worker, Queue, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';
import { google } from 'googleapis';
import { getPeakWindows, PeakWindow } from '../services/focusStability.service';
import { decrypt, encrypt } from '../utils/crypto';

const prisma = new PrismaClient();
const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'gcal-sync';

export const gcalSyncQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection as any,
});

export const gcalSyncWorker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
        const { userId } = job.data;
        if (!userId) return;

        console.log(`[worker] Executing gcal-sync for user=${userId}`);
        const connection = await (prisma as any).googleCalendarConnection.findUnique({ where: { userId } });
        if (!connection) return;

        try {
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_CALLBACK_URL
            );

            oauth2Client.setCredentials({
                access_token: decrypt(connection.accessToken),
                refresh_token: decrypt(connection.refreshToken)
            });

            // Handle token refresh automatically if needed
            oauth2Client.on('tokens', async (tokens) => {
                if (tokens.refresh_token) {
                     await (prisma as any).googleCalendarConnection.update({
                         where: { userId },
                         data: { refreshToken: encrypt(tokens.refresh_token) }
                     });
                }
                if (tokens.access_token) {
                     await (prisma as any).googleCalendarConnection.update({
                         where: { userId },
                         data: { accessToken: encrypt(tokens.access_token) }
                     });
                }
            });

            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            
            // Generate peak windows
            const windows: PeakWindow[] = await getPeakWindows(userId);
            
            // Delete existing focus events that are no longer peaks or rewrite them
            const existingEvents = await (prisma as any).focusCalendarEvent.findMany({ where: { userId } });
            
            // Because peak slots might shift, the simplest approach is to delete prior events from DB & GCal,
            // and recreate fresh ones.
            for (const ev of existingEvents) {
                if (ev.gcalEventId) {
                    try {
                        await calendar.events.delete({
                            calendarId: connection.calendarId || 'primary',
                            eventId: ev.gcalEventId
                        });
                    } catch (e: any) {
                        // ignore if already deleted
                        if (e.code !== 404 && e.code !== 410) {
                            console.error('Failed to delete legacy event', e);
                        }
                    }
                }
            }
            // Clear db tracking
            await (prisma as any).focusCalendarEvent.deleteMany({ where: { userId } });

            // Create new recurring events
            for (const w of windows) {
                const d = new Date();
                const currentDay = d.getDay();
                const distance = (w.dayOfWeek + 7 - currentDay) % 7;
                const nextDate = new Date(d);
                nextDate.setDate(d.getDate() + distance);
                nextDate.setHours(w.startHour, 0, 0, 0);

                const endDate = new Date(nextDate);
                endDate.setHours(w.endHour, 0, 0, 0);

                const event = {
                    summary: 'Deep Work — Protected',
                    description: 'Protected by Floework',
                    start: {
                        dateTime: nextDate.toISOString(),
                        timeZone: 'UTC', // Ensure consistent times
                    },
                    end: {
                        dateTime: endDate.toISOString(),
                        timeZone: 'UTC',
                    },
                    recurrence: [
                        'RRULE:FREQ=WEEKLY'
                    ],
                    reminders: {
                        useDefault: true,
                    },
                };

                const res = await calendar.events.insert({
                    calendarId: connection.calendarId || 'primary',
                    requestBody: event,
                });

                if (res.data.id) {
                    await (prisma as any).focusCalendarEvent.create({
                        data: {
                            userId,
                            gcalEventId: res.data.id,
                            dayOfWeek: w.dayOfWeek,
                            startHour: w.startHour,
                            endHour: w.endHour
                        }
                    });
                }
            }

            // Mark synced
            await (prisma as any).googleCalendarConnection.update({
                where: { userId },
                data: { lastSynced: new Date() }
            });
            console.log(`[worker] Successfully synced Gcal for user=${userId}`);
        } catch (error) {
            console.error(`[worker] GCAL Sync failed for user=${userId}:`, error);
        }
    },
    { connection: redisConnection as any }
);

export async function scheduleGlobalGcalSync() {
    // We can also schedule a cron task for global refresh if needed.
    const repeatableJobs = await gcalSyncQueue.getRepeatableJobs();
    const existing = repeatableJobs.find(j => j.name === 'global-sync-job');
    if (!existing) {
        await gcalSyncQueue.add('global-sync-job', {}, {
            repeat: {
                pattern: '0 8 * * 0', // Sundays 08:00 UTC
            }
        });
        console.log('[queue] Scheduled global gcal-sync');
    }
}
