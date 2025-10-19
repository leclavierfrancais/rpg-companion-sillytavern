/**
 * Security Utilities Module
 * Handles input sanitization and validation to prevent security vulnerabilities
 */

/**
 * List of dangerous property names that could cause prototype pollution
 * or shadow critical object methods.
 * @private
 */
const BLOCKED_PROPERTY_NAMES = [
    '__proto__',
    'constructor',
    'prototype',
    'toString',
    'valueOf',
    'hasOwnProperty',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__'
];

/**
 * Validates and sanitizes storage location names.
 * Prevents prototype pollution and object property shadowing attacks.
 *
 * @param {string} name - Location name to validate
 * @returns {string|null} Sanitized location name or null if invalid/dangerous
 *
 * @example
 * sanitizeLocationName("Home") // "Home"
 * sanitizeLocationName("__proto__") // null (blocked, logs warning)
 * sanitizeLocationName("A".repeat(300)) // "AAA..." (truncated to 200 chars)
 */
export function sanitizeLocationName(name) {
    if (!name || typeof name !== 'string') {
        return null;
    }

    const trimmed = name.trim();

    // Empty check
    if (trimmed === '') {
        return null;
    }

    // Check for dangerous property names (case-insensitive)
    const lowerName = trimmed.toLowerCase();
    if (BLOCKED_PROPERTY_NAMES.some(blocked => lowerName === blocked.toLowerCase())) {
        console.warn(`[RPG Companion] Blocked dangerous location name: "${trimmed}"`);
        return null;
    }

    // Max length check (reasonable location name)
    const MAX_LOCATION_LENGTH = 200;
    if (trimmed.length > MAX_LOCATION_LENGTH) {
        console.warn(`[RPG Companion] Location name too long (${trimmed.length} chars), truncating to ${MAX_LOCATION_LENGTH}`);
        return trimmed.slice(0, MAX_LOCATION_LENGTH);
    }

    return trimmed;
}

/**
 * Validates and sanitizes item names.
 * Prevents excessively long item names that could cause DoS or UI issues.
 *
 * @param {string} name - Item name to validate
 * @returns {string|null} Sanitized item name or null if invalid
 *
 * @example
 * sanitizeItemName("Sword") // "Sword"
 * sanitizeItemName("") // null
 * sanitizeItemName("A".repeat(600)) // "AAA..." (truncated to 500 chars)
 */
export function sanitizeItemName(name) {
    if (!name || typeof name !== 'string') {
        return null;
    }

    const trimmed = name.trim();

    // Empty check
    if (trimmed === '' || trimmed.toLowerCase() === 'none') {
        return null;
    }

    // Max length check (reasonable item name with description)
    const MAX_ITEM_LENGTH = 500;
    if (trimmed.length > MAX_ITEM_LENGTH) {
        console.warn(`[RPG Companion] Item name too long (${trimmed.length} chars), truncating to ${MAX_ITEM_LENGTH}`);
        return trimmed.slice(0, MAX_ITEM_LENGTH);
    }

    return trimmed;
}

/**
 * Validates and cleans a stored inventory object.
 * Ensures all keys are safe property names and all values are strings.
 * Prevents prototype pollution attacks via object keys.
 *
 * @param {Object} stored - Raw stored inventory object
 * @returns {Object} Cleaned stored inventory object (always a plain object)
 *
 * @example
 * validateStoredInventory({ "Home": "Sword, Shield" })
 * // → { "Home": "Sword, Shield" }
 *
 * validateStoredInventory({ "__proto__": "malicious" })
 * // → {} (dangerous key removed, logged)
 *
 * validateStoredInventory(null)
 * // → {} (invalid input, returns empty object)
 */
export function validateStoredInventory(stored) {
    // Handle invalid input
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
        return {};
    }

    const cleaned = {};

    // Validate each property
    for (const key in stored) {
        // Only check own properties (not inherited)
        if (!Object.prototype.hasOwnProperty.call(stored, key)) {
            continue;
        }

        // Sanitize the location name
        const sanitizedKey = sanitizeLocationName(key);
        if (!sanitizedKey) {
            // Key was invalid or dangerous, skip it
            continue;
        }

        // Ensure value is a string
        const value = stored[key];
        if (typeof value !== 'string') {
            console.warn(`[RPG Companion] Invalid stored inventory value for location "${sanitizedKey}", skipping`);
            continue;
        }

        // Add to cleaned object
        cleaned[sanitizedKey] = value;
    }

    return cleaned;
}

/**
 * Maximum number of items allowed in a single inventory section.
 * Prevents DoS via extremely large item lists.
 * @constant {number}
 */
export const MAX_ITEMS_PER_SECTION = 500;
