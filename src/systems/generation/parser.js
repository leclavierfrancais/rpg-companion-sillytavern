/**
 * Parser Module
 * Handles parsing of AI responses to extract tracker data
 */

import { extensionSettings, FEATURE_FLAGS } from '../../core/state.js';
import { saveSettings } from '../../core/persistence.js';
import { extractInventory } from './inventoryParser.js';

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

    // DEBUG: Log full response for troubleshooting
    console.log('[RPG Parser] ==================== PARSING AI RESPONSE ====================');
    console.log('[RPG Parser] Response length:', responseText.length, 'chars');
    console.log('[RPG Parser] First 500 chars:', responseText.substring(0, 500));

    // Extract code blocks
    const codeBlockRegex = /```([^`]+)```/g;
    const matches = [...responseText.matchAll(codeBlockRegex)];

    console.log('[RPG Parser] Found', matches.length, 'code blocks');

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const content = match[1].trim();

        console.log(`[RPG Parser] --- Code Block ${i + 1} ---`);
        console.log('[RPG Parser] First 300 chars:', content.substring(0, 300));

        // Match Stats section - flexible patterns
        const isStats =
            content.match(/Stats\s*\n\s*---/i) ||
            content.match(/User Stats\s*\n\s*---/i) ||
            content.match(/Player Stats\s*\n\s*---/i) ||
            // Fallback: look for stat keywords without strict header
            (content.match(/Health:\s*\d+%/i) && content.match(/Energy:\s*\d+%/i));

        // Match Info Box section - flexible patterns
        const isInfoBox =
            content.match(/Info Box\s*\n\s*---/i) ||
            content.match(/Scene Info\s*\n\s*---/i) ||
            content.match(/Information\s*\n\s*---/i) ||
            // Fallback: look for info box keywords
            (content.match(/Date:/i) && content.match(/Location:/i) && content.match(/Time:/i));

        // Match Present Characters section - flexible patterns
        const isCharacters =
            content.match(/Present Characters\s*\n\s*---/i) ||
            content.match(/Characters\s*\n\s*---/i) ||
            content.match(/Character Thoughts\s*\n\s*---/i) ||
            // Fallback: look for table-like structure with emoji and pipes
            (content.includes(" | ") && (content.includes("Thoughts") || content.includes("💭")));

        if (isStats) {
            result.userStats = content;
            console.log('[RPG Parser] ✓ Matched: Stats section');
        } else if (isInfoBox) {
            result.infoBox = content;
            console.log('[RPG Parser] ✓ Matched: Info Box section');
        } else if (isCharacters) {
            result.characterThoughts = content;
            console.log('[RPG Parser] ✓ Matched: Present Characters section');
            console.log('[RPG Parser] Full content:', content);
        } else {
            console.log('[RPG Parser] ✗ No match - checking patterns:');
            console.log('[RPG Parser]   - Has "Stats\\n---"?', !!content.match(/Stats\s*\n\s*---/i));
            console.log('[RPG Parser]   - Has stat keywords?', !!(content.match(/Health:\s*\d+%/i) && content.match(/Energy:\s*\d+%/i)));
            console.log('[RPG Parser]   - Has "Info Box\\n---"?', !!content.match(/Info Box\s*\n\s*---/i));
            console.log('[RPG Parser]   - Has info keywords?', !!(content.match(/Date:/i) && content.match(/Location:/i)));
            console.log('[RPG Parser]   - Has "Present Characters\\n---"?', !!content.match(/Present Characters\s*\n\s*---/i));
            console.log('[RPG Parser]   - Has " | " + thoughts?', !!(content.includes(" | ") && (content.includes("Thoughts") || content.includes("💭"))));
        }
    }

    console.log('[RPG Parser] ==================== PARSE RESULTS ====================');
    console.log('[RPG Parser] Found Stats:', !!result.userStats);
    console.log('[RPG Parser] Found Info Box:', !!result.infoBox);
    console.log('[RPG Parser] Found Characters:', !!result.characterThoughts);
    console.log('[RPG Parser] =======================================================');

    return result;
}

/**
 * Parses user stats from the text and updates the extensionSettings.
 * Extracts percentages, mood, conditions, and inventory from the stats text.
 *
 * @param {string} statsText - The raw stats text from AI response
 */
export function parseUserStats(statsText) {
    console.log('[RPG Parser] ==================== PARSING USER STATS ====================');
    console.log('[RPG Parser] Stats text length:', statsText.length, 'chars');
    console.log('[RPG Parser] Stats text preview:', statsText.substring(0, 200));

    try {
        // Extract percentages and mood/conditions
        const healthMatch = statsText.match(/Health:\s*(\d+)%/);
        const satietyMatch = statsText.match(/Satiety:\s*(\d+)%/);
        const energyMatch = statsText.match(/Energy:\s*(\d+)%/);
        const hygieneMatch = statsText.match(/Hygiene:\s*(\d+)%/);
        const arousalMatch = statsText.match(/Arousal:\s*(\d+)%/);

        console.log('[RPG Parser] Stat matches:', {
            health: healthMatch ? healthMatch[1] : 'NOT FOUND',
            satiety: satietyMatch ? satietyMatch[1] : 'NOT FOUND',
            energy: energyMatch ? energyMatch[1] : 'NOT FOUND',
            hygiene: hygieneMatch ? hygieneMatch[1] : 'NOT FOUND',
            arousal: arousalMatch ? arousalMatch[1] : 'NOT FOUND'
        });

        // Match mood/status with multiple format variations
        // Format 1: Status: [Emoji, Conditions]
        // Format 2: Status: [Emoji], [Conditions]
        // Format 3: [Emoji]: [Conditions] (legacy)
        // Format 4: Mood: [Emoji] - [Conditions]
        let moodMatch = null;

        // Try new format: Status: emoji, conditions
        const statusMatch = statsText.match(/Status:\s*(.+?),\s*(.+)/i);
        if (statusMatch) {
            moodMatch = [null, statusMatch[1].trim(), statusMatch[2].trim()];
        }
        // Try alternative: Mood: emoji, conditions
        else {
            const moodAltMatch = statsText.match(/Mood:\s*(.+?)[,\-]\s*(.+)/i);
            if (moodAltMatch) {
                moodMatch = [null, moodAltMatch[1].trim(), moodAltMatch[2].trim()];
            }
        }

        // Legacy format fallback: [Emoji]: [Conditions]
        if (!moodMatch) {
            const lines = statsText.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // Skip lines with percentages or known keywords
                if (line.includes('%') ||
                    line.toLowerCase().startsWith('inventory:') ||
                    line.toLowerCase().startsWith('status:') ||
                    line.toLowerCase().startsWith('health:') ||
                    line.toLowerCase().startsWith('energy:') ||
                    line.toLowerCase().startsWith('satiety:') ||
                    line.toLowerCase().startsWith('hygiene:') ||
                    line.toLowerCase().startsWith('arousal:')) continue;

                // Match emoji/mood followed by colon and conditions
                const match = line.match(/^(.+?):\s*(.+)$/);
                if (match && match[1].length <= 10) { // Emoji/mood should be short
                    moodMatch = match;
                    break;
                }
            }
        }

        console.log('[RPG Parser] Mood/Status match:', {
            found: !!moodMatch,
            emoji: moodMatch ? moodMatch[1] : 'NOT FOUND',
            conditions: moodMatch ? moodMatch[2] : 'NOT FOUND'
        });

        // Extract inventory - use v2 parser if feature flag enabled, otherwise fallback to v1
        if (FEATURE_FLAGS.useNewInventory) {
            const inventoryData = extractInventory(statsText);
            if (inventoryData) {
                extensionSettings.userStats.inventory = inventoryData;
                console.log('[RPG Parser] Inventory v2 extracted:', inventoryData);
            } else {
                console.log('[RPG Parser] Inventory v2 extraction failed');
            }
        } else {
            // Legacy v1 parsing for backward compatibility
            const inventoryMatch = statsText.match(/Inventory:\s*(.+)/i);
            if (inventoryMatch) {
                extensionSettings.userStats.inventory = inventoryMatch[1].trim();
                console.log('[RPG Parser] Inventory v1 extracted:', inventoryMatch[1].trim());
            } else {
                console.log('[RPG Parser] Inventory v1 not found');
            }
        }

        // Update extension settings
        if (healthMatch) extensionSettings.userStats.health = parseInt(healthMatch[1]);
        if (satietyMatch) extensionSettings.userStats.satiety = parseInt(satietyMatch[1]);
        if (energyMatch) extensionSettings.userStats.energy = parseInt(energyMatch[1]);
        if (hygieneMatch) extensionSettings.userStats.hygiene = parseInt(hygieneMatch[1]);
        if (arousalMatch) extensionSettings.userStats.arousal = parseInt(arousalMatch[1]);
        if (moodMatch) {
            extensionSettings.userStats.mood = moodMatch[1].trim(); // Emoji
            extensionSettings.userStats.conditions = moodMatch[2].trim(); // Conditions
        }

        console.log('[RPG Parser] Final userStats after parsing:', {
            health: extensionSettings.userStats.health,
            satiety: extensionSettings.userStats.satiety,
            energy: extensionSettings.userStats.energy,
            hygiene: extensionSettings.userStats.hygiene,
            arousal: extensionSettings.userStats.arousal,
            mood: extensionSettings.userStats.mood,
            conditions: extensionSettings.userStats.conditions,
            inventory: FEATURE_FLAGS.useNewInventory ? 'v2 object' : extensionSettings.userStats.inventory
        });

        saveSettings();
        console.log('[RPG Parser] Settings saved successfully');
        console.log('[RPG Parser] =======================================================');
    } catch (error) {
        console.error('[RPG Companion] Error parsing user stats:', error);
        console.error('[RPG Companion] Stack trace:', error.stack);
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
