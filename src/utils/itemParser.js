/**
 * Item Parser Module
 * Utilities for parsing item strings into arrays and vice versa
 */

/**
 * Parses a comma-separated item string into an array of trimmed item names.
 * Filters out empty strings and handles "None" gracefully.
 * Smart handling: collapses newlines inside parentheses, preserves them outside.
 *
 * @param {string} itemString - Comma-separated items (e.g., "Sword, Shield, 3x Potions")
 * @returns {string[]} Array of item names, or empty array if none
 *
 * @example
 * parseItems("Sword, Shield, 3x Potions") // ["Sword", "Shield", "3x Potions"]
 * parseItems("Books (magical\ntomes), Sword") // ["Books (magical tomes)", "Sword"]
 * parseItems("None") // []
 * parseItems("") // []
 * parseItems(null) // []
 */
export function parseItems(itemString) {
    // Handle null/undefined/non-string
    if (!itemString || typeof itemString !== 'string') {
        return [];
    }

    // Trim and check for "None" (case-insensitive)
    const trimmed = itemString.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'none') {
        return [];
    }

    // Collapse newlines inside parentheses
    let processed = '';
    let parenDepth = 0;

    for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];

        if (char === '(') {
            parenDepth++;
            processed += char;
        } else if (char === ')') {
            parenDepth--;
            processed += char;
        } else if ((char === '\n' || char === '\r') && parenDepth > 0) {
            // Inside parentheses: replace newline with space
            // Skip if previous char was already a space
            if (processed[processed.length - 1] !== ' ') {
                processed += ' ';
            }
        } else {
            processed += char;
        }
    }

    // Clean up multiple consecutive spaces
    processed = processed.replace(/\s+/g, ' ');

    // Split by comma, trim each item, filter empties
    return processed
        .split(',')
        .map(item => item.trim())
        .filter(item => item !== '' && item.toLowerCase() !== 'none');
}

/**
 * Serializes an array of items back into a comma-separated string.
 * Returns "None" for empty arrays.
 *
 * @param {string[]} itemArray - Array of item names
 * @returns {string} Comma-separated string, or "None" if empty
 *
 * @example
 * serializeItems(["Sword", "Shield", "3x Potions"]) // "Sword, Shield, 3x Potions"
 * serializeItems([]) // "None"
 * serializeItems(["Sword"]) // "Sword"
 */
export function serializeItems(itemArray) {
    // Handle null/undefined/non-array
    if (!itemArray || !Array.isArray(itemArray)) {
        return 'None';
    }

    // Filter out empty strings and trim
    const cleaned = itemArray
        .filter(item => item && typeof item === 'string' && item.trim() !== '')
        .map(item => item.trim());

    // Return "None" if array is empty after cleaning
    if (cleaned.length === 0) {
        return 'None';
    }

    // Join with comma and space
    return cleaned.join(', ');
}
