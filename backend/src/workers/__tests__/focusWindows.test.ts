import { describe, it, expect } from 'vitest';

export function computePeakWindows(activeSlots: any[]) {
    if (activeSlots.length < 3) return [];
    
    // Sort slots by day, then hour
    activeSlots.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour);
    
    const windows = [];
    let currentWindow: any = null;

    for (const slot of activeSlots) {
        if (!currentWindow) {
            currentWindow = { ...slot };
        } else if (currentWindow.dayOfWeek === slot.dayOfWeek && currentWindow.endHour >= slot.startHour) {
            // Contiguous merge
            currentWindow.endHour = Math.max(currentWindow.endHour, slot.endHour);
        } else {
            windows.push(currentWindow);
            currentWindow = { ...slot };
        }
    }
    if (currentWindow) windows.push(currentWindow);

    return windows.slice(0, 3);
}

describe('focusWindows service', () => {
    it('computePeakWindows: returns [] when user has < 3 distinct slot bounds', () => {
        expect(computePeakWindows([{ dayOfWeek: 1, startHour: 9, endHour: 10 }])).toEqual([]);
    });

    it('computePeakWindows: returns max 3 windows', () => {
        const slots = [
            { dayOfWeek: 1, startHour: 9, endHour: 10 },
            { dayOfWeek: 2, startHour: 9, endHour: 10 },
            { dayOfWeek: 3, startHour: 9, endHour: 10 },
            { dayOfWeek: 4, startHour: 9, endHour: 10 }
        ];
        expect(computePeakWindows(slots).length).toBe(3);
    });

    it('contiguous slot merge: hours [9,10,11] on same day → {startHour:9, endHour:12}', () => {
        const slots = [
            { dayOfWeek: 1, startHour: 9, endHour: 10 },
            { dayOfWeek: 1, startHour: 10, endHour: 11 },
            { dayOfWeek: 1, startHour: 11, endHour: 12 }
        ];
        const res = computePeakWindows(slots);
        expect(res.length).toBe(1);
        expect(res[0]).toEqual({ dayOfWeek: 1, startHour: 9, endHour: 12 });
    });

    it('non-contiguous slots: [9,10,14,15] → 2 separate windows', () => {
        const slots = [
            { dayOfWeek: 2, startHour: 9, endHour: 10 },
            { dayOfWeek: 2, startHour: 14, endHour: 15 },
            { dayOfWeek: 2, startHour: 10, endHour: 11 },
            { dayOfWeek: 2, startHour: 15, endHour: 16 }
        ];
        const res = computePeakWindows(slots);
        expect(res.length).toBe(2);
        expect(res[0]).toEqual({ dayOfWeek: 2, startHour: 9, endHour: 11 });
        expect(res[1]).toEqual({ dayOfWeek: 2, startHour: 14, endHour: 16 });
    });
});
