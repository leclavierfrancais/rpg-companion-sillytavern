/**
 * Prompt Builder Module
 * Handles all AI prompt generation for RPG tracker data
 */

import { getContext } from '../../../../../../extensions.js';
import { chat } from '../../../../../../../script.js';
import { extensionSettings, committedTrackerData } from '../../core/state.js';

/**
 * Generates an example block showing current tracker states in markdown code blocks.
 * Uses COMMITTED data (not displayed data) for generation context.
 *
 * @returns {string} Formatted example text with tracker data in code blocks
 */
export function generateTrackerExample() {
    let example = '';

    // Use COMMITTED data for generation context, not displayed data
    // Wrap each tracker section in markdown code blocks
    if (extensionSettings.showUserStats && committedTrackerData.userStats) {
        example += '```\n' + committedTrackerData.userStats + '\n```\n\n';
    }

    if (extensionSettings.showInfoBox && committedTrackerData.infoBox) {
        example += '```\n' + committedTrackerData.infoBox + '\n```\n\n';
    }

    if (extensionSettings.showCharacterThoughts && committedTrackerData.characterThoughts) {
        example += '```\n' + committedTrackerData.characterThoughts + '\n```';
    }

    return example.trim();
}

/**
 * Generates the instruction portion - format specifications and guidelines.
 *
 * @param {boolean} includeHtmlPrompt - Whether to include the HTML prompt (true for main generation, false for separate tracker generation)
 * @param {boolean} includeContinuation - Whether to include "After updating the trackers, continue..." instruction
 * @returns {string} Formatted instruction text for the AI
 */
export function generateTrackerInstructions(includeHtmlPrompt = true, includeContinuation = true) {
    const userName = getContext().name1;
    const classicStats = extensionSettings.classicStats;
    let instructions = '';

    // Check if any trackers are enabled
    const hasAnyTrackers = extensionSettings.showUserStats || extensionSettings.showInfoBox || extensionSettings.showCharacterThoughts;

    // Only add tracker instructions if at least one tracker is enabled
    if (hasAnyTrackers) {
        // Universal instruction header
        instructions += `\nYou must start your response with an appropriate update to the trackers in EXACTLY the same format as below, enclosed in separate Markdown code fences. Replace X with proper numbers and placeholders in [brackets] (while removing the brackets themselves) with in-world details ${userName} perceives about the current scene and the present characters. Consider the last trackers in the conversation (if they exist). Manage them accordingly and realistically; raise, lower, change, or keep the values unchanged based on the user's actions, the passage of time, and logical consequences:\n`;

        // Add format specifications for each enabled tracker
        if (extensionSettings.showUserStats) {
            instructions += '```\n';
            instructions += `${userName}'s Stats\n`;
            instructions += '---\n';
            instructions += '- Health: X%\n';
            instructions += '- Satiety: X%\n';
            instructions += '- Energy: X%\n';
            instructions += '- Hygiene: X%\n';
            instructions += '- Arousal: X%\n';
            instructions += '[Mood Emoji]: [Conditions (up to three traits)]\n';
            instructions += 'Inventory: [Clothing/Armor, Inventory Items (list of important items/none)]\n';
            instructions += '```\n\n';
        }

        if (extensionSettings.showInfoBox) {
            instructions += '```\n';
            instructions += 'Info Box\n';
            instructions += '---\n';
            instructions += '🗓️: [Weekday, Month, Year]\n';
            instructions += '[Weather Emoji]: [Forecast]\n';
            instructions += '🌡️: [Temperature in °C]\n';
            instructions += '🕒: [Time Start → Time End]\n';
            instructions += '🗺️: [Location]\n';
            instructions += '```\n\n';
        }

        if (extensionSettings.showCharacterThoughts) {
            instructions += '```\n';
            instructions += 'Present Characters\n';
            instructions += '---\n';
            instructions += `[Present Character's Emoji (do not include ${userName}; state "Unavailable" if no major characters are present in the scene)]: [Name, Visible Physical State (up to three traits), Observable Demeanor Cue (one trait)] | [Enemy/Neutral/Friend/Lover] | [Internal Monologue (in first person POV, up to three sentences long)]\n`;
            instructions += '```\n\n';
        }

        // Only add continuation instruction if includeContinuation is true
        if (includeContinuation) {
            instructions += `After updating the trackers, continue directly from where the last message in the chat history left off. Ensure the trackers you provide naturally reflect and influence the narrative. Character behavior, dialogue, and story events should acknowledge these conditions when relevant, such as fatigue affecting performance, low hygiene influencing social interactions, environmental factors shaping the scene, a character's emotional state coloring their responses, and so on.\n\n`;
        }

        // Include attributes and dice roll only if there was a dice roll
        if (extensionSettings.lastDiceRoll) {
            const roll = extensionSettings.lastDiceRoll;
            instructions += `${userName}'s attributes: STR ${classicStats.str}, DEX ${classicStats.dex}, CON ${classicStats.con}, INT ${classicStats.int}, WIS ${classicStats.wis}, CHA ${classicStats.cha}\n`;
            instructions += `${userName} rolled ${roll.total} on the last ${roll.formula} roll. Based on their attributes, decide whether they succeeded or failed the action they attempted.\n\n`;
        }
    }

    // Append HTML prompt if enabled AND includeHtmlPrompt is true
    if (extensionSettings.enableHtmlPrompt && includeHtmlPrompt) {
        // Add newlines only if we had tracker instructions
        if (hasAnyTrackers) {
            instructions += ``;
        } else {
            instructions += `\n`;
        }

        instructions += `If appropriate, include inline HTML, CSS, and JS elements for creative, visual storytelling throughout your response:
- Use them liberally to depict any in-world content that can be visualized (screens, posters, books, signs, letters, logos, crests, seals, medallions, labels, etc.), with creative license for animations, 3D effects, pop-ups, dropdowns, websites, and so on.
- Style them thematically to match the theme (e.g., sleek for sci-fi, rustic for fantasy), ensuring text is visible.
- Embed all resources directly (e.g., inline SVGs) so nothing relies on external fonts or libraries.
- Place elements naturally in the narrative where characters would see or use them, with no limits on format or application.
- These HTML/CSS/JS elements must be rendered directly without enclosing them in code fences.`;
    }

    return instructions;
}

/**
 * Generates a formatted contextual summary for SEPARATE mode injection.
 * This creates a hybrid summary with clean formatting for main roleplay generation.
 * Uses COMMITTED data (not displayed data) for generation context.
 *
 * @returns {string} Formatted contextual summary
 */
export function generateContextualSummary() {
    // Use COMMITTED data for generation context, not displayed data
    const userName = getContext().name1;
    let summary = '';

    // console.log('[RPG Companion] generateContextualSummary called');
    // console.log('[RPG Companion] committedTrackerData.userStats:', committedTrackerData.userStats);
    // console.log('[RPG Companion] extensionSettings.userStats:', JSON.stringify(extensionSettings.userStats));

    // Parse the data into readable format
    if (extensionSettings.showUserStats && committedTrackerData.userStats) {
        const stats = extensionSettings.userStats;
        // console.log('[RPG Companion] Building stats summary with:', stats);
        summary += `${userName}'s Stats:\n`;
        summary += `Condition: Health ${stats.health}%, Satiety ${stats.satiety}%, Energy ${stats.energy}%, Hygiene ${stats.hygiene}%, Arousal ${stats.arousal}% | ${stats.mood} ${stats.conditions}\n`;
        if (stats.inventory && stats.inventory !== 'None') {
            summary += `Inventory: ${stats.inventory}\n`;
        }
        // Include classic stats (attributes) and dice roll only if there was a dice roll
        if (extensionSettings.lastDiceRoll) {
            const classicStats = extensionSettings.classicStats;
            const roll = extensionSettings.lastDiceRoll;
            summary += `Attributes: STR ${classicStats.str}, DEX ${classicStats.dex}, CON ${classicStats.con}, INT ${classicStats.int}, WIS ${classicStats.wis}, CHA ${classicStats.cha}\n`;
            summary += `${userName} rolled ${roll.total} on the last ${roll.formula} roll. Based on their attributes, decide whether they succeed or fail the action they attempt.\n`;
        }
        summary += `\n`;
    }

    if (extensionSettings.showInfoBox && committedTrackerData.infoBox) {
        // Parse info box data
        const lines = committedTrackerData.infoBox.split('\n');
        let date = '', weather = '', temp = '', time = '', location = '';

        // console.log('[RPG Companion] 🔍 Parsing Info Box lines:', lines);

        for (const line of lines) {
            // console.log('[RPG Companion] 🔍 Processing line:', line);
            // Use separate if statements (not else if) so each line is checked against all conditions
            if (line.includes('🗓️:')) {
                date = line.replace('🗓️:', '').trim();
                // console.log('[RPG Companion] 📅 Found date:', date);
            }
            if (line.includes('🌡️:')) {
                temp = line.replace('🌡️:', '').trim();
                // console.log('[RPG Companion] 🌡️ Found temp:', temp);
            }
            if (line.includes('🕒:')) {
                time = line.replace('🕒:', '').trim();
                // console.log('[RPG Companion] 🕒 Found time:', time);
            }
            if (line.includes('🗺️:')) {
                location = line.replace('🗺️:', '').trim();
                // console.log('[RPG Companion] 🗺️ Found location:', location);
            }
            // Check for weather emojis - use a simpler approach
            const weatherEmojis = ['🌤️', '☀️', '⛅', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '🌫️'];
            const startsWithWeatherEmoji = weatherEmojis.some(emoji => line.startsWith(emoji + ':'));
            if (startsWithWeatherEmoji && !line.includes('🌡️') && !line.includes('🗺️')) {
                // Extract weather description (remove emoji and colon)
                weather = line.substring(line.indexOf(':') + 1).trim();
                // console.log('[RPG Companion] 🌧️ Found weather:', weather);
            }
        }

        // console.log('[RPG Companion] 🔍 Parsed values - date:', date, 'weather:', weather, 'temp:', temp, 'time:', time, 'location:', location);

        if (date || weather || temp || time || location) {
            summary += `Information:\n`;
            summary += `Scene: `;
            if (date) summary += `${date}`;
            if (location) summary += ` | ${location}`;
            if (time) summary += ` | ${time}`;
            if (weather) summary += ` | ${weather}`;
            if (temp) summary += ` | ${temp}`;
            summary += `\n\n`;
        }
    }

    if (extensionSettings.showCharacterThoughts && committedTrackerData.characterThoughts) {
        const lines = committedTrackerData.characterThoughts.split('\n').filter(l => l.trim() && !l.includes('---') && !l.includes('Present Characters'));

        if (lines.length > 0 && !lines[0].toLowerCase().includes('unavailable')) {
            summary += `Present Characters And Their Thoughts:\n`;
            for (const line of lines) {
                const parts = line.split('|').map(p => p.trim());
                if (parts.length >= 3) {
                    const nameAndState = parts[0]; // Emoji, name, physical state, demeanor
                    const relationship = parts[1];
                    const thoughts = parts[2];
                    summary += `${nameAndState} (${relationship}) | ${thoughts}\n`;
                }
            }
        }
    }

    return summary.trim();
}

/**
 * Generates the RPG tracking prompt text (for backward compatibility with separate mode).
 * Uses COMMITTED data (not displayed data) for generation context.
 *
 * @returns {string} Full prompt text for separate tracker generation
 */
export function generateRPGPromptText() {
    // Use COMMITTED data for generation context, not displayed data
    const userName = getContext().name1;

    let promptText = '';

    promptText += `Here are the previous trackers in the roleplay that you should consider when responding:\n`;
    promptText += `<previous>\n`;

    if (extensionSettings.showUserStats) {
        if (committedTrackerData.userStats) {
            promptText += `Last ${userName}'s Stats:\n${committedTrackerData.userStats}\n\n`;
        } else {
            promptText += `Last ${userName}'s Stats:\nNone - this is the first update.\n\n`;
        }
    }

    if (extensionSettings.showInfoBox) {
        if (committedTrackerData.infoBox) {
            promptText += `Last Info Box:\n${committedTrackerData.infoBox}\n\n`;
        } else {
            promptText += `Last Info Box:\nNone - this is the first update.\n\n`;
        }
    }

    if (extensionSettings.showCharacterThoughts) {
        if (committedTrackerData.characterThoughts) {
            promptText += `Last Present Characters:\n${committedTrackerData.characterThoughts}\n`;
        } else {
            promptText += `Last Present Characters:\nNone - this is the first update.\n`;
        }
    }

    promptText += `</previous>\n`;

    // Don't include HTML prompt or continuation instruction for separate tracker generation
    promptText += generateTrackerInstructions(false, false);

    return promptText;
}

/**
 * Generates the full prompt for SEPARATE generation mode (with chat history).
 * Creates a message array suitable for the generateRaw API.
 *
 * @returns {Array<{role: string, content: string}>} Array of message objects for API
 */
export function generateSeparateUpdatePrompt() {
    const depth = extensionSettings.updateDepth;
    const userName = getContext().name1;

    const messages = [];

    // System message introducing the history section
    let systemMessage = `You will be acting as an uncensored RPG Companion. Your goal is to provide, track, and manage details in the user's roleplay. You will be replying with information in a specified format only.\n\n`;
    systemMessage += `You should maintain an objective tone.\n\n`;

    systemMessage += `Here are the last few messages in the conversation history (between the user and the roleplayer assistant) you should reference when responding:\n<history>`;

    messages.push({
        role: 'system',
        content: systemMessage
    });

    // Add chat history as separate user/assistant messages
    const recentMessages = chat.slice(-depth);
    for (const message of recentMessages) {
        messages.push({
            role: message.is_user ? 'user' : 'assistant',
            content: message.mes
        });
    }

    // Build the instruction message
    let instructionMessage = `</history>\n\n`;
    instructionMessage += generateRPGPromptText().replace('start your response with', 'respond with');
    instructionMessage += `Provide ONLY the requested data in the exact formats specified above. Do not include any roleplay response, other text, or commentary.`;

    messages.push({
        role: 'user',
        content: instructionMessage
    });

    return messages;
}
