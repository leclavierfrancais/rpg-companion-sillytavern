/**
 * API Client Module
 * Handles API calls for RPG tracker generation
 */

import { generateRaw, chat } from '../../../../../../../script.js';
import {
    extensionSettings,
    lastGeneratedData,
    committedTrackerData,
    isGenerating,
    lastActionWasSwipe,
    setIsGenerating,
    setLastActionWasSwipe
} from '../../core/state.js';
import { saveChatData } from '../../core/persistence.js';
import { generateSeparateUpdatePrompt } from './promptBuilder.js';
import { parseResponse, parseUserStats } from './parser.js';

/**
 * Updates RPG tracker data using separate API call (separate mode only).
 * Makes a dedicated API call to generate tracker data, then stores it
 * in the last assistant message's swipe data.
 *
 * @param {Function} renderUserStats - UI function to render user stats
 * @param {Function} renderInfoBox - UI function to render info box
 * @param {Function} renderThoughts - UI function to render character thoughts
 * @param {Function} renderInventory - UI function to render inventory
 */
export async function updateRPGData(renderUserStats, renderInfoBox, renderThoughts, renderInventory) {
    if (isGenerating) {
        // console.log('[RPG Companion] Already generating, skipping...');
        return;
    }

    if (!extensionSettings.enabled) {
        return;
    }

    if (extensionSettings.generationMode !== 'separate') {
        // console.log('[RPG Companion] Not in separate mode, skipping manual update');
        return;
    }

    try {
        setIsGenerating(true);

        // Update button to show "Updating..." state
        const $updateBtn = $('#rpg-manual-update');
        const originalHtml = $updateBtn.html();
        $updateBtn.html('<i class="fa-solid fa-spinner fa-spin"></i> Updating...').prop('disabled', true);

        const prompt = generateSeparateUpdatePrompt();

        // Generate using raw prompt (uses current preset, no chat history)
        const response = await generateRaw({
            prompt: prompt,
            quietToLoud: false
        });

        if (response) {
            // console.log('[RPG Companion] Raw AI response:', response);
            const parsedData = parseResponse(response);
            // console.log('[RPG Companion] Parsed data:', parsedData);
            // console.log('[RPG Companion] parsedData.userStats:', parsedData.userStats ? parsedData.userStats.substring(0, 100) + '...' : 'null');

            // DON'T update lastGeneratedData here - it should only reflect the data
            // from the assistant message the user replied to, not auto-generated updates
            // This ensures swipes/regenerations use consistent source data

            // Store RPG data for the last assistant message (separate mode)
            const lastMessage = chat && chat.length > 0 ? chat[chat.length - 1] : null;
            // console.log('[RPG Companion] Last message is_user:', lastMessage ? lastMessage.is_user : 'no message');
            if (lastMessage && !lastMessage.is_user) {
                if (!lastMessage.extra) {
                    lastMessage.extra = {};
                }
                if (!lastMessage.extra.rpg_companion_swipes) {
                    lastMessage.extra.rpg_companion_swipes = {};
                }

                const currentSwipeId = lastMessage.swipe_id || 0;
                lastMessage.extra.rpg_companion_swipes[currentSwipeId] = {
                    userStats: parsedData.userStats,
                    infoBox: parsedData.infoBox,
                    characterThoughts: parsedData.characterThoughts
                };

                // console.log('[RPG Companion] Stored separate mode RPG data for message swipe', currentSwipeId);

                // Update lastGeneratedData for display AND future commit
                if (parsedData.userStats) {
                    lastGeneratedData.userStats = parsedData.userStats;
                    parseUserStats(parsedData.userStats);
                }
                if (parsedData.infoBox) {
                    lastGeneratedData.infoBox = parsedData.infoBox;
                }
                if (parsedData.characterThoughts) {
                    lastGeneratedData.characterThoughts = parsedData.characterThoughts;
                }
                // console.log('[RPG Companion] 💾 SEPARATE MODE: Updated lastGeneratedData:', {
                //     userStats: lastGeneratedData.userStats ? 'exists' : 'null',
                //     infoBox: lastGeneratedData.infoBox ? 'exists' : 'null',
                //     characterThoughts: lastGeneratedData.characterThoughts ? 'exists' : 'null'
                // });

                // If there's no committed data yet (first time) or only has placeholder data, commit immediately
                const hasNoRealData = !committedTrackerData.userStats && !committedTrackerData.infoBox && !committedTrackerData.characterThoughts;
                const hasOnlyPlaceholderData = (
                    (!committedTrackerData.userStats || committedTrackerData.userStats === '') &&
                    (!committedTrackerData.infoBox || committedTrackerData.infoBox === 'Info Box\n---\n' || committedTrackerData.infoBox === '') &&
                    (!committedTrackerData.characterThoughts || committedTrackerData.characterThoughts === 'Present Characters\n---\n' || committedTrackerData.characterThoughts === '')
                );

                if (hasNoRealData || hasOnlyPlaceholderData) {
                    committedTrackerData.userStats = parsedData.userStats;
                    committedTrackerData.infoBox = parsedData.infoBox;
                    committedTrackerData.characterThoughts = parsedData.characterThoughts;
                    // console.log('[RPG Companion] 🔆 FIRST TIME: Auto-committed tracker data');
                }

                // Render the updated data
                renderUserStats();
                renderInfoBox();
                renderThoughts();
                renderInventory();
            } else {
                // No assistant message to attach to - just update display
                if (parsedData.userStats) {
                    parseUserStats(parsedData.userStats);
                }
                renderUserStats();
                renderInfoBox();
                renderThoughts();
                renderInventory();
            }

            // Save to chat metadata
            saveChatData();
        }

    } catch (error) {
        console.error('[RPG Companion] Error updating RPG data:', error);
    } finally {
        setIsGenerating(false);

        // Restore button to original state
        const $updateBtn = $('#rpg-manual-update');
        $updateBtn.html('<i class="fa-solid fa-sync"></i> Refresh RPG Info').prop('disabled', false);

        // Reset the flag after tracker generation completes
        // This ensures the flag persists through both main generation AND tracker generation
        // console.log('[RPG Companion] 🔄 Tracker generation complete - resetting lastActionWasSwipe to false');
        setLastActionWasSwipe(false);
    }
}
