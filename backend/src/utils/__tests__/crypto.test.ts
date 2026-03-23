import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../crypto';

// Setup env for test
process.env.ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';

describe('Crypto Utility', () => {
    it('encrypt then decrypt returns original plaintext', () => {
        const plaintext = "super-secret-oauth-token";
        const cipher = encrypt(plaintext);
        const deciphered = decrypt(cipher);
        expect(deciphered).toBe(plaintext);
    });

    it('encrypt produces different ciphertext on each call (random IV)', () => {
        const plaintext = "same-secret";
        const cipher1 = encrypt(plaintext);
        const cipher2 = encrypt(plaintext);
        expect(cipher1).not.toBe(cipher2);
    });

    it('decrypt throws on tampered ciphertext', () => {
        const cipher = encrypt("secret");
        const parts = cipher.split(':');
        // tamper with IV
        const tampered = `111111111${parts[0].substring(9)}:${parts[1]}:${parts[2]}`;
        expect(() => decrypt(tampered)).toThrow();
    });
});
