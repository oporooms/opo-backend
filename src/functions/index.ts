import { FlightSegment } from "@/types/Flight/FlightData";

export function formatIndianPhoneNumber(phone: string | number): {
    cleanedPhone?: string;
    ErrorCode: number;
    ErrorMessage: string;
} {
    // Remove extra spaces and non-digit characters (except a leading +)
    const cleaned = String(phone).trim().replace(/\s+/g, '').replace(/[^\d+]/g, '');

    // If the cleaned string is longer than 10 digits, verify it has a valid country code
    if (cleaned.length > 10) {
        if (!(cleaned.startsWith('+91') || cleaned.startsWith('91'))) {
            return {
                ErrorCode: 1,
                ErrorMessage: "Invalid country code. It should start with +91 or 91."
            };
        }
    }

    // Remove any non-digit characters for consistent processing
    const digits = cleaned.replace(/\D/g, '');

    // Ensure the core number consists of exactly 10 digits
    if (digits.length === 10) {
        return { cleanedPhone: digits, ErrorCode: 0, ErrorMessage: "" };
    } else if (digits.length === 12 && digits.startsWith('91')) {
        return { cleanedPhone: digits.slice(2), ErrorCode: 0, ErrorMessage: "" };
    } else {
        return { ErrorCode: 1, ErrorMessage: "Invalid phone number format" };
    }
}

export function validateEmail(email: string): { cleanedEmail?: string, ErrorCode: number; ErrorMessage: string } {
    const cleanedEmail = email.trim();
    if (cleanedEmail.length === 0) {
        return { ErrorCode: 1, ErrorMessage: "Email address is empty" };
    }

    // This regex follows RFC 5322 guidelines to cover most valid email formats.
    const emailRegex = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\[(?:(?:IPv6:[a-fA-F0-9:.]+)|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d))\]))$/;
    if (!emailRegex.test(cleanedEmail)) {
        return { ErrorCode: 2, ErrorMessage: "Invalid email format" };
    }

    return { cleanedEmail, ErrorCode: 0, ErrorMessage: "" };
}

export function overallClassification(segments: FlightSegment[]): 'domestic' | 'international' {
    const isAnyInternational = segments.some(seg => seg.Origin.CountryCode !== seg.Destination.CountryCode);
    return isAnyInternational ? 'international' : 'domestic';
}

// utils/sleep.ts
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const removeNoSqlInjection = (input: string): string => {
    // Stronger sanitization against common MongoDB operator / traversal injection
    if (typeof input !== 'string') return '';

    let value = input.trim();

    // Remove null bytes
    value = value.replace(/\0/g, '');

    // Neutralize known MongoDB query/operator prefixes by stripping leading $
    value = value.replace(
        /\$(?:ne|gt|lt|gte|lte|in|nin|or|and|nor|not|regex|where|expr|function|jsonSchema|options)\b/gi,
        m => m.slice(1)
    );

    // Remove any remaining lone $ starting a token
    value = value.replace(/(^|[\s,{[])\$/g, '$1');

    // Prevent dot-notation key traversal
    value = value.replace(/\./g, '_');

    // Escape regex metacharacters (if later inserted into a dynamic RegExp)
    value = value.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');

    // Enforce a reasonable max length to avoid abuse
    if (value.length > 1024) value = value.slice(0, 1024);

    return value;
};