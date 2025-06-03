
export function compareArray<T extends object>(array1: T[], array2: T[], key: keyof T): boolean {
    const keySet1 = new Set(array1.map(obj => obj[key]));
    const keySet2 = new Set(array2.map(obj => obj[key]));

    // Compare the sets to check for equality
    return keySet1.size === keySet2.size && [...keySet1].every(key => keySet2.has(key));
}

export function debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return function (this: unknown, ...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args); // Explicitly binds 'this' to the debounced function
        }, delay);
    };
}

export function newDate(d: Date) {
    const date = new Date(d)
    date.setHours(0, 0, 0, 0)

    return date
}

export function formatIndianPhoneNumber(phone: string): {
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

export function validatePhone(
    phone: string
): { cleanedPhone?: string, ErrorCode: number; ErrorMessage: string } {
    // Clean the input by removing extra spaces
    const cleaned: string = String(phone).trim();
    if (cleaned.length === 0) {
        return { ErrorCode: 1, ErrorMessage: "Phone number is empty" };
    }

    // Regex explanation:
    // ^(?:\+91|0|91)? - Optionally match country code +91, 0, or 91
    // ([6-9]\d{9})$ - Capture exactly 10 digits starting with a digit between 6 and 9
    const phoneRegex: RegExp = /^(?:\+91|0|91)?([6-9]\d{9})$/;
    const match: RegExpMatchArray | null = cleaned.match(phoneRegex);

    if (!match) {
        // Determine error based on possible input characteristics
        if (!/^(?:\+91|0|91)?/.test(cleaned)) {
            return {
                ErrorCode: 1,
                ErrorMessage:
                    "Country code is invalid. It should start with +91, 0, or 91 if provided."
            };
        }
        return {
            ErrorCode: 1,
            ErrorMessage:
                "Invalid phone number format. Phone number must have exactly 10 digits starting with a number between 6 and 9."
        };
    }

    // Return the normalized 10-digit phone number
    return {
        cleanedPhone: match[1],
        ErrorCode: 0,
        ErrorMessage: ""
    };
}

export function isAlphabetic(str: string): boolean {
    return /^[A-Za-z\s]+$/.test(str);
}