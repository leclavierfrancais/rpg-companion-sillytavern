/**
 * Parser Module
 * Handles parsing of AI responses to extract tracker data
 */

import { extensionSettings } from '../../core/state.js';
import { saveSettings } from '../../core/persistence.js';

/**
 * Parses the model response to extract the different data sections.
 * Extracts tracker data from markdown code blocks in the AI response.
 *
 * @param {string} responseText - The raw AI response text
 * @returns {{userStats: string|null, infoBox: string|null, characterThoughts: string|null}} Parsed tracker data
 */
export function parseResponse(responseText) {
    const result = {
        userStats: null,
        infoBox: null,
        characterThoughts: null
    };

    // Extract code blocks
    const codeBlockRegex = /```([^`]+)```/g;
    const matches = [...responseText.matchAll(codeBlockRegex)];

    // console.log('[RPG Companion] Found', matches.length, 'code blocks');

    for (const match of matches) {
        const content = match[1].trim();

        // console.log('[RPG Companion] Checking code block (first 200 chars):', content.substring(0, 200));

        // Match Stats section
        if (content.match(/Stats\s*\n\s*---/i)) {
            result.userStats = content;
            // console.log('[RPG Companion] ✓ Found Stats section');
        }
        // Match Info Box section
        else if (content.match(/Info Box\s*\n\s*---/i)) {
            result.infoBox = content;
            // console.log('[RPG Companion] ✓ Found Info Box section');
        }
        // Match Present Characters section - flexible matching
        else if (content.match(/Present Characters\s*\n\s*---/i) || content.includes(" | ")) {
            result.characterThoughts = content;
            // console.log('[RPG Companion] ✓ Found Present Characters section:', content);
        } else {
            // console.log('[RPG Companion] ✗ Code block did not match any section');
        }
    }

    // console.log('[RPG Companion] Parse results:', {
    //     hasStats: !!result.userStats,
    //     hasInfoBox: !!result.infoBox,
    //     hasThoughts: !!result.characterThoughts
    // });

    return result;
}

/**
 * Parses user stats from the text and updates the extensionSettings.
 * Extracts percentages, mood, conditions, and inventory from the stats text.
 *
 * @param {string} statsText - The raw stats text from AI response
 */
export function parseUserStats(statsText) {
    try {
        // Extract percentages and mood/conditions
        const healthMatch = statsText.match(/Health:\s*(\d+)%/);
        const satietyMatch = statsText.match(/Satiety:\s*(\d+)%/);
        const energyMatch = statsText.match(/Energy:\s*(\d+)%/);
        const hygieneMatch = statsText.match(/Hygiene:\s*(\d+)%/);
        const arousalMatch = statsText.match(/Arousal:\s*(\d+)%/);

        // Match new format: [Emoji]: [Conditions]
        // Look for a line after Arousal that has format [something]: [text]
        // Split by lines and find the line after percentages
        const lines = statsText.split('\n');
        let moodMatch = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip lines with percentages or "Inventory:"
            if (line.includes('%') || line.toLowerCase().startsWith('inventory:')) continue;
            // Match emoji followed by colon and conditions
            const match = line.match(/^(.+?):\s*(.+)$/);
            if (match) {
                moodMatch = match;
                break;
            }
        }

        // Extract inventory
        const inventoryMatch = statsText.match(/Inventory:\s*(.+)/i);

        if (healthMatch) extensionSettings.userStats.health = parseInt(healthMatch[1]);
        if (satietyMatch) extensionSettings.userStats.satiety = parseInt(satietyMatch[1]);
        if (energyMatch) extensionSettings.userStats.energy = parseInt(energyMatch[1]);
        if (hygieneMatch) extensionSettings.userStats.hygiene = parseInt(hygieneMatch[1]);
        if (arousalMatch) extensionSettings.userStats.arousal = parseInt(arousalMatch[1]);
        if (moodMatch) {
            extensionSettings.userStats.mood = moodMatch[1].trim(); // Emoji
            extensionSettings.userStats.conditions = moodMatch[2].trim(); // Conditions
        }
        if (inventoryMatch) {
            extensionSettings.userStats.inventory = inventoryMatch[1].trim();
        }

        saveSettings();
    } catch (error) {
        console.error('[RPG Companion] Error parsing user stats:', error);
    }
}

/**
 * Helper: Extract code blocks from text
 * @param {string} text - Text containing markdown code blocks
 * @returns {Array<string>} Array of code block contents
 */
export function extractCodeBlocks(text) {
    const codeBlockRegex = /```([^`]+)```/g;
    const matches = [...text.matchAll(codeBlockRegex)];
    return matches.map(match => match[1].trim());
}

/**
 * Helper: Parse stats section from code block content
 * @param {string} content - Code block content
 * @returns {boolean} True if this is a stats section
 */
export function isStatsSection(content) {
    return content.match(/Stats\s*\n\s*---/i) !== null;
}

/**
 * Helper: Parse info box section from code block content
 * @param {string} content - Code block content
 * @returns {boolean} True if this is an info box section
 */
export function isInfoBoxSection(content) {
    return content.match(/Info Box\s*\n\s*---/i) !== null;
}

/**
 * Helper: Parse character thoughts section from code block content
 * @param {string} content - Code block content
 * @returns {boolean} True if this is a character thoughts section
 */
export function isCharacterThoughtsSection(content) {
    return content.match(/Present Characters\s*\n\s*---/i) !== null || content.includes(" | ");
}
