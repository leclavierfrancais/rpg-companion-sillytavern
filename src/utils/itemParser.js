/**
 * Item Parser Module
 * Utilities for parsing item strings into arrays and vice versa
 */

/**
 * Parses a comma-separated item string into an array of trimmed item names.
 * Filters out empty strings and handles "None" gracefully.
 * Smart handling:
 * - Strips wrapping square brackets that AI sometimes adds
 * - Collapses newlines inside parentheses to spaces
 * - Only splits on commas OUTSIDE parentheses (commas inside parentheses are preserved)
 *
 * @param {string} itemString - Comma-separated items (e.g., "Sword, Shield, 3x Potions")
 * @returns {string[]} Array of item names, or empty array if none
 *
 * @example
 * parseItems("Sword, Shield, 3x Potions") // ["Sword", "Shield", "3x Potions"]
 * parseItems("Books (magical\ntomes), Sword") // ["Books (magical tomes)", "Sword"]
 * parseItems("Potato (Cursed, Sexy, Your Mum & Dick, Etc), Sword") // ["Potato (Cursed, Sexy, Your Mum & Dick, Etc)", "Sword"]
 * parseItems("[Sword, Shield]") // ["Sword", "Shield"]
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
    let trimmed = itemString.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'none') {
        return [];
    }

    // Strip wrapping square brackets if present (AI sometimes adds these)
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        trimmed = trimmed.slice(1, -1).trim();
        // Check again for empty after stripping brackets
        if (trimmed === '' || trimmed.toLowerCase() === 'none') {
            return [];
        }
    }

    // First pass: Collapse newlines inside parentheses
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

    // Second pass: Smart comma splitting (only split on commas outside parentheses)
    const items = [];
    let currentItem = '';
    parenDepth = 0;

    for (let i = 0; i < processed.length; i++) {
        const char = processed[i];

        if (char === '(') {
            parenDepth++;
            currentItem += char;
        } else if (char === ')') {
            parenDepth--;
            currentItem += char;
        } else if (char === ',' && parenDepth === 0) {
            // Comma outside parentheses - this is a separator
            const trimmedItem = currentItem.trim();
            if (trimmedItem !== '' && trimmedItem.toLowerCase() !== 'none') {
                items.push(trimmedItem);
            }
            currentItem = ''; // Start new item
        } else {
            currentItem += char;
        }
    }

    // Don't forget the last item
    const trimmedItem = currentItem.trim();
    if (trimmedItem !== '' && trimmedItem.toLowerCase() !== 'none') {
        items.push(trimmedItem);
    }

    return items;
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
