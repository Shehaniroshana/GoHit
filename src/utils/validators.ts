/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate if a string is valid JSON
 */
export function isValidJson(str: string): boolean {
    if (!str || str.trim() === '') {
        return true; // Empty string is valid (no body)
    }

    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Format JSON string with indentation
 */
export function formatJson(json: string): string {
    try {
        const parsed = JSON.parse(json);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return json;
    }
}

/**
 * Validate environment name
 */
export function isValidEnvironmentName(name: string): boolean {
    if (!name || name.trim() === '') {
        return false;
    }

    // Only allow alphanumeric, underscore, and hyphen
    return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Replace path parameters in URL
 */
export function replacePathParams(path: string, params: Record<string, string>): string {
    let result = path;

    for (const [key, value] of Object.entries(params)) {
        result = result.replace(`:${key}`, value);
        result = result.replace(`*${key}`, value);
    }

    return result;
}
