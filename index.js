import { getContext, renderExtensionTemplateAsync } from '../../extensions.js';
import { eventSource, event_types, substituteParams, chat, generateRaw, saveSettingsDebounced, chat_metadata, saveChatDebounced, user_avatar, getThumbnailUrl, characters, this_chid, extension_prompt_types, extension_prompt_roles, setExtensionPrompt, reloadCurrentChat } from '../../../script.js';
import { selected_group, getGroupMembers } from '../../group-chats.js';
import { power_user } from '../../power-user.js';

const extensionName = 'rpg-companion';
const extensionFolderPath = `scripts/extensions/${extensionName}`;

let extensionSettings = {
    enabled: true,
    autoUpdate: true,
    updateDepth: 4, // How many messages to include in the context
    generationMode: 'together', // 'separate' or 'together' - whether to generate with main response or separately
    showUserStats: true,
    showInfoBox: true,
    showCharacterThoughts: true,
    showThoughtsInChat: false, // Show thoughts overlay in chat
    enableHtmlPrompt: false, // Enable immersive HTML prompt injection
    enablePlotButtons: true, // Show plot progression buttons above chat input
    panelPosition: 'right', // 'left', 'right', or 'top'
    theme: 'default', // Theme: default, sci-fi, fantasy, cyberpunk, custom
    customColors: {
        bg: '#1a1a2e',
        accent: '#16213e',
        text: '#eaeaea',
        highlight: '#e94560'
    },
    statBarColorLow: '#cc3333', // Color for low stat values (red)
    statBarColorHigh: '#33cc66', // Color for high stat values (green)
    enableAnimations: true, // Enable smooth animations for stats and content updates
    userStats: {
        health: 100,
        sustenance: 100,
        energy: 100,
        hygiene: 100,
        arousal: 0,
        mood: '😐',
        conditions: 'None',
        inventory: 'None'
    },
    classicStats: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10
    },
    lastDiceRoll: null // Store last dice roll result
};

let lastGeneratedData = {
    userStats: null,
    infoBox: null,
    characterThoughts: null,
    html: null
};

// Tracks the "committed" tracker data that should be used as source for next generation
// This gets updated when user sends a new message or first time generation
let committedTrackerData = {
    userStats: null,
    infoBox: null,
    characterThoughts: null
};

// Tracks whether the last action was a swipe (for separate mode)
// Used to determine whether to commit lastGeneratedData to committedTrackerData
let lastActionWasSwipe = false;

let isGenerating = false;

// UI Elements
let $panelContainer = null;
let $userStatsContainer = null;
let $infoBoxContainer = null;
let $thoughtsContainer = null;

/**
 * Loads the extension settings from the global settings object.
 */
function loadSettings() {
    if (power_user.extensions && power_user.extensions[extensionName]) {
        Object.assign(extensionSettings, power_user.extensions[extensionName]);
        // console.log('[RPG Companion] Settings loaded:', extensionSettings);
    } else {
        // console.log('[RPG Companion] No saved settings found, using defaults');
    }
}

/**
 * Saves the extension settings to the global settings object.
 */
function saveSettings() {
    if (!power_user.extensions) {
        power_user.extensions = {};
    }
    power_user.extensions[extensionName] = extensionSettings;
    saveSettingsDebounced();
}

/**
 * Saves RPG data to the current chat's metadata.
 */
function saveChatData() {
    if (!chat_metadata) {
        return;
    }

    chat_metadata.rpg_companion = {
        userStats: extensionSettings.userStats,
        classicStats: extensionSettings.classicStats,
        lastGeneratedData: lastGeneratedData,
        timestamp: Date.now()
    };

    saveChatDebounced();
}

/**
 * Updates the last assistant message's swipe data with current tracker data.
 * This ensures user edits are preserved across swipes and included in generation context.
 */
function updateMessageSwipeData() {
    const chat = getContext().chat;
    if (!chat || chat.length === 0) {
        return;
    }

    // Find the last assistant message
    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i];
        if (!message.is_user) {
            // Found last assistant message - update its swipe data
            if (!message.extra) {
                message.extra = {};
            }
            if (!message.extra.rpg_companion_swipes) {
                message.extra.rpg_companion_swipes = {};
            }

            const swipeId = message.swipe_id || 0;
            message.extra.rpg_companion_swipes[swipeId] = {
                userStats: lastGeneratedData.userStats,
                infoBox: lastGeneratedData.infoBox,
                characterThoughts: lastGeneratedData.characterThoughts
            };

            // console.log('[RPG Companion] Updated message swipe data after user edit');
            break;
        }
    }
}

/**
 * Loads RPG data from the current chat's metadata.
 */
function loadChatData() {
    if (!chat_metadata || !chat_metadata.rpg_companion) {
        // Reset to defaults if no data exists
        extensionSettings.userStats = {
            health: 100,
            sustenance: 100,
            energy: 100,
            hygiene: 100,
            arousal: 0,
            mood: '😐',
            conditions: 'None',
            inventory: 'None'
        };
        lastGeneratedData = {
            userStats: null,
            infoBox: null,
            characterThoughts: null,
            html: null
        };
        return;
    }

    const savedData = chat_metadata.rpg_companion;

    // Restore stats
    if (savedData.userStats) {
        extensionSettings.userStats = { ...savedData.userStats };
    }

    // Restore classic stats
    if (savedData.classicStats) {
        extensionSettings.classicStats = { ...savedData.classicStats };
    }

    // Restore last generated data
    if (savedData.lastGeneratedData) {
        lastGeneratedData = { ...savedData.lastGeneratedData };
    }

    // console.log('[RPG Companion] Loaded chat data:', savedData);
}

/**
 * Applies the selected theme to the panel.
 */
function applyTheme() {
    if (!$panelContainer) return;

    const theme = extensionSettings.theme;

    // Remove all theme attributes first
    $panelContainer.removeAttr('data-theme');

    // Clear any inline CSS variable overrides
    $panelContainer.css({
        '--rpg-bg': '',
        '--rpg-accent': '',
        '--rpg-text': '',
        '--rpg-highlight': '',
        '--rpg-border': '',
        '--rpg-shadow': ''
    });

    // Apply the selected theme
    if (theme === 'custom') {
        applyCustomTheme();
    } else if (theme !== 'default') {
        // For non-default themes, set the data-theme attribute
        // which will trigger the CSS theme rules
        $panelContainer.attr('data-theme', theme);
    }
    // For 'default', we do nothing - it will use the CSS variables from .rpg-panel class
    // which fall back to SillyTavern's theme variables
}

/**
 * Applies custom colors when custom theme is selected.
 */
function applyCustomTheme() {
    if (!$panelContainer) return;

    const colors = extensionSettings.customColors;

    // Apply custom CSS variables as inline styles
    $panelContainer.css({
        '--rpg-bg': colors.bg,
        '--rpg-accent': colors.accent,
        '--rpg-text': colors.text,
        '--rpg-highlight': colors.highlight,
        '--rpg-border': colors.highlight,
        '--rpg-shadow': `${colors.highlight}80` // Add alpha for shadow
    });
}

/**
 * Toggles visibility of custom color pickers.
 */
function toggleCustomColors() {
    const isCustom = extensionSettings.theme === 'custom';
    $('#rpg-custom-colors').toggle(isCustom);
}

/**
 * Toggles animations on/off by adding/removing a class to the panel.
 */
function toggleAnimations() {
    if (extensionSettings.enableAnimations) {
        $panelContainer.addClass('rpg-animations-enabled');
    } else {
        $panelContainer.removeClass('rpg-animations-enabled');
    }
}

/**
 * Adds the extension settings to the Extensions tab.
 */
async function addExtensionSettings() {
    const settingsHtml = await renderExtensionTemplateAsync(extensionName, 'settings');
    $('#rpg_companion_container').append(settingsHtml);

    // Set up the enable/disable toggle
    $('#rpg-extension-enabled').prop('checked', extensionSettings.enabled).on('change', function() {
        extensionSettings.enabled = $(this).prop('checked');
        saveSettings();
        updatePanelVisibility();

        if (!extensionSettings.enabled) {
            // Clear extension prompts and thought bubbles when disabled
            clearExtensionPrompts();
            updateChatThoughts(); // This will remove the thought bubble since extension is disabled
        } else {
            // Re-create thought bubbles when re-enabled
            updateChatThoughts(); // This will re-create the thought bubble if data exists
        }
    });
}

/**
 * Initializes the UI for the extension.
 */
async function initUI() {
    // Load the HTML template using SillyTavern's template system
    const templateHtml = await renderExtensionTemplateAsync(extensionName, 'template');

    // Add to the appropriate container based on position
    if (extensionSettings.panelPosition === 'right') {
        // Add as a sidebar next to the chat area (sheld)
        $('#sheld').after(templateHtml);
    } else {
        // Add above the chat area
        $('#sheld').before(templateHtml);
    }    // Cache UI elements
    $panelContainer = $('#rpg-companion-panel');
    $userStatsContainer = $('#rpg-user-stats');
    $infoBoxContainer = $('#rpg-info-box');
    $thoughtsContainer = $('#rpg-thoughts');

    // Set up event listeners (enable/disable is handled in Extensions tab)
    $('#rpg-toggle-auto-update').on('change', function() {
        extensionSettings.autoUpdate = $(this).prop('checked');
        saveSettings();
    });

    $('#rpg-position-select').on('change', function() {
        extensionSettings.panelPosition = String($(this).val());
        saveSettings();
        applyPanelPosition();
        // Recreate thought bubbles to update their position
        updateChatThoughts();
    });

    $('#rpg-update-depth').on('change', function() {
        const value = $(this).val();
        extensionSettings.updateDepth = parseInt(String(value));
        saveSettings();
    });

    $('#rpg-generation-mode').on('change', function() {
        extensionSettings.generationMode = String($(this).val());
        saveSettings();
        updateGenerationModeUI();
    });

    $('#rpg-toggle-user-stats').on('change', function() {
        extensionSettings.showUserStats = $(this).prop('checked');
        saveSettings();
        updateSectionVisibility();
    });

    $('#rpg-toggle-info-box').on('change', function() {
        extensionSettings.showInfoBox = $(this).prop('checked');
        saveSettings();
        updateSectionVisibility();
    });

    $('#rpg-toggle-thoughts').on('change', function() {
        extensionSettings.showCharacterThoughts = $(this).prop('checked');
        saveSettings();
        updateSectionVisibility();
    });

    $('#rpg-toggle-thoughts-in-chat').on('change', function() {
        extensionSettings.showThoughtsInChat = $(this).prop('checked');
        // console.log('[RPG Companion] Toggle showThoughtsInChat changed to:', extensionSettings.showThoughtsInChat);
        saveSettings();
        updateChatThoughts();
    });

    $('#rpg-toggle-html-prompt').on('change', function() {
        extensionSettings.enableHtmlPrompt = $(this).prop('checked');
        // console.log('[RPG Companion] Toggle enableHtmlPrompt changed to:', extensionSettings.enableHtmlPrompt);
        saveSettings();
    });

    $('#rpg-toggle-plot-buttons').on('change', function() {
        extensionSettings.enablePlotButtons = $(this).prop('checked');
        // console.log('[RPG Companion] Toggle enablePlotButtons changed to:', extensionSettings.enablePlotButtons);
        saveSettings();
        togglePlotButtons();
    });

    $('#rpg-toggle-animations').on('change', function() {
        extensionSettings.enableAnimations = $(this).prop('checked');
        saveSettings();
        toggleAnimations();
    });

    $('#rpg-manual-update').on('click', async function() {
        if (!extensionSettings.enabled) {
            // console.log('[RPG Companion] Extension is disabled. Please enable it in the Extensions tab.');
            return;
        }
        await updateRPGData();
    });

    $('#rpg-stat-bar-color-low').on('change', function() {
        extensionSettings.statBarColorLow = String($(this).val());
        saveSettings();
        renderUserStats(); // Re-render with new colors
    });

    $('#rpg-stat-bar-color-high').on('change', function() {
        extensionSettings.statBarColorHigh = String($(this).val());
        saveSettings();
        renderUserStats(); // Re-render with new colors
    });

    // Theme selection
    $('#rpg-theme-select').on('change', function() {
        extensionSettings.theme = String($(this).val());
        saveSettings();
        applyTheme();
        toggleCustomColors();
        updateSettingsPopupTheme(); // Update popup theme instantly
        updateChatThoughts(); // Recreate thought bubbles with new theme
    });

    // Custom color pickers
    $('#rpg-custom-bg').on('change', function() {
        extensionSettings.customColors.bg = String($(this).val());
        saveSettings();
        if (extensionSettings.theme === 'custom') {
            applyCustomTheme();
            updateSettingsPopupTheme(); // Update popup theme instantly
            updateChatThoughts(); // Update thought bubbles
        }
    });

    $('#rpg-custom-accent').on('change', function() {
        extensionSettings.customColors.accent = String($(this).val());
        saveSettings();
        if (extensionSettings.theme === 'custom') {
            applyCustomTheme();
            updateSettingsPopupTheme(); // Update popup theme instantly
            updateChatThoughts(); // Update thought bubbles
        }
    });

    $('#rpg-custom-text').on('change', function() {
        extensionSettings.customColors.text = String($(this).val());
        saveSettings();
        if (extensionSettings.theme === 'custom') {
            applyCustomTheme();
            updateSettingsPopupTheme(); // Update popup theme instantly
            updateChatThoughts(); // Update thought bubbles
        }
    });

    $('#rpg-custom-highlight').on('change', function() {
        extensionSettings.customColors.highlight = String($(this).val());
        saveSettings();
        if (extensionSettings.theme === 'custom') {
            applyCustomTheme();
            updateSettingsPopupTheme(); // Update popup theme instantly
            updateChatThoughts(); // Update thought bubbles
        }
    });

    // Initialize UI state (enable/disable is in Extensions tab)
    $('#rpg-toggle-auto-update').prop('checked', extensionSettings.autoUpdate);
    $('#rpg-position-select').val(extensionSettings.panelPosition);
    $('#rpg-update-depth').val(extensionSettings.updateDepth);
    $('#rpg-use-main-model').prop('checked', extensionSettings.useMainModel);
    $('#rpg-toggle-user-stats').prop('checked', extensionSettings.showUserStats);
    $('#rpg-toggle-info-box').prop('checked', extensionSettings.showInfoBox);
    $('#rpg-toggle-thoughts').prop('checked', extensionSettings.showCharacterThoughts);
    $('#rpg-toggle-thoughts-in-chat').prop('checked', extensionSettings.showThoughtsInChat);
    $('#rpg-toggle-html-prompt').prop('checked', extensionSettings.enableHtmlPrompt);
    $('#rpg-toggle-plot-buttons').prop('checked', extensionSettings.enablePlotButtons);
    $('#rpg-toggle-animations').prop('checked', extensionSettings.enableAnimations);
    $('#rpg-stat-bar-color-low').val(extensionSettings.statBarColorLow);
    $('#rpg-stat-bar-color-high').val(extensionSettings.statBarColorHigh);
    $('#rpg-theme-select').val(extensionSettings.theme);
    $('#rpg-custom-bg').val(extensionSettings.customColors.bg);
    $('#rpg-custom-accent').val(extensionSettings.customColors.accent);
    $('#rpg-custom-text').val(extensionSettings.customColors.text);
    $('#rpg-custom-highlight').val(extensionSettings.customColors.highlight);
    $('#rpg-generation-mode').val(extensionSettings.generationMode);

    updatePanelVisibility();
    updateSectionVisibility();
    updateGenerationModeUI();
    applyTheme();
    applyPanelPosition();
    toggleCustomColors();
    toggleAnimations();

    // Render initial data if available
    renderUserStats();
    renderInfoBox();
    renderThoughts();
    updateDiceDisplay();
    setupDiceRoller();
    setupSettingsPopup();
    addDiceQuickReply();
    setupPlotButtons();
}

/**
 * Sets up the plot progression buttons inside the send form area.
 */
function setupPlotButtons() {
    // Remove existing buttons if any
    $('#rpg-plot-buttons').remove();

    // Create wrapper if it doesn't exist (shared with other extensions like Spotify)
    if ($('#extension-buttons-wrapper').length === 0) {
        $('#send_form').prepend('<div id="extension-buttons-wrapper" style="text-align: center; margin: 5px auto;"></div>');
    }

    // Create the button container
    const buttonHtml = `
        <span id="rpg-plot-buttons" style="display: none;">
            <button id="rpg-plot-random" class="menu_button interactable" style="
                background-color: #e94560;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 13px;
                cursor: pointer;
                margin: 0 4px;
                display: inline-block;
            " tabindex="0" role="button">
                <i class="fa-solid fa-dice"></i> Randomized Plot
            </button>
            <button id="rpg-plot-natural" class="menu_button interactable" style="
                background-color: #4a90e2;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 13px;
                cursor: pointer;
                margin: 0 4px;
                display: inline-block;
            " tabindex="0" role="button">
                <i class="fa-solid fa-forward"></i> Natural Plot
            </button>
        </span>
    `;

    // Insert into the wrapper
    $('#extension-buttons-wrapper').append(buttonHtml);

    // Add event handlers for buttons
    $('#rpg-plot-random').on('click', () => sendPlotProgression('random'));
    $('#rpg-plot-natural').on('click', () => sendPlotProgression('natural'));

    // Show/hide based on setting
    togglePlotButtons();
}/**
 * Toggles the visibility of plot buttons based on settings.
 */
function togglePlotButtons() {
    if (extensionSettings.enablePlotButtons && extensionSettings.enabled) {
        $('#rpg-plot-buttons').show();
    } else {
        $('#rpg-plot-buttons').hide();
    }
}

/**
 * Sends a plot progression request and appends the result to the last message.
 * @param {string} type - 'random' or 'natural'
 */
async function sendPlotProgression(type) {
    if (!extensionSettings.enabled) {
        // console.log('[RPG Companion] Extension is disabled');
        return;
    }

    // Disable buttons to prevent multiple clicks
    $('#rpg-plot-random, #rpg-plot-natural').prop('disabled', true).css('opacity', '0.5');

    // Store original enabled state and temporarily disable extension
    const wasEnabled = extensionSettings.enabled;
    extensionSettings.enabled = false;

    try {
        // console.log(`[RPG Companion] Sending ${type} plot progression request...`);

        // Build the prompt based on type
        let prompt = '';
        if (type === 'random') {
            prompt = 'Actually, the scene is getting stale. Introduce {{random::stakes::a plot twist::a new character::a cataclysm::a fourth-wall-breaking joke::a sudden atmospheric phenomenon::a plot hook::a running gag::an ecchi scenario::Death from Discworld::a new stake::a drama::a conflict::an angered entity::a god::a vision::a prophetic dream::Il Dottore from Genshin Impact::a new development::a civilian in need::an emotional bit::a threat::a villain::an important memory recollection::a marriage proposal::a date idea::an angry horde of villagers with pitchforks::a talking animal::an enemy::a cliffhanger::a short omniscient POV shift to a completely different character::a quest::an unexpected revelation::a scandal::an evil clone::death of an important character::harm to an important character::a romantic setup::a gossip::a messenger::a plot point from the past::a plot hole::a tragedy::a ghost::an otherworldly occurrence::a plot device::a curse::a magic device::a rival::an unexpected pregnancy::a brothel::a prostitute::a new location::a past lover::a completely random thing::a what-if scenario::a significant choice::war::love::a monster::lewd undertones::Professor Mari::a travelling troupe::a secret::a fortune-teller::something completely different::a killer::a murder mystery::a mystery::a skill check::a deus ex machina::three raccoons in a trench coat::a pet::a slave::an orphan::a psycho::tentacles::"there is only one bed" trope::accidental marriage::a fun twist::a boss battle::sexy corn::an eldritch horror::a character getting hungry, thirsty, or exhausted::horniness::a need for a bathroom break need::someone fainting::an assassination attempt::a meta narration of this all being an out of hand DND session::a dungeon::a friend in need::an old friend::a small time skip::a scene shift::Aurora Borealis, at this time of year, at this time of day, at this part of the country::a grand ball::a surprise party::zombies::foreshadowing::a Spanish Inquisition (nobody expects it)::a natural plot progression}} to make things more interesting! Be creative, but stay grounded in the setting.';
        } else {
            prompt = 'Actually, the scene is getting stale. Progress it, to make things more interesting! Reintroduce an unresolved plot point from the past, or push the story further towards the current main goal. Be creative, but stay grounded in the setting.';
        }

        // Add HTML prompt if enabled
        if (extensionSettings.enableHtmlPrompt) {
            prompt += '\n\n' + `If appropriate, include inline HTML, CSS, and JS elements for creative, visual storytelling throughout your response:
- Use them liberally to depict any in-world content that can be visualized (screens, posters, books, signs, letters, logos, crests, seals, medallions, labels, etc.), with creative license for animations, 3D effects, pop-ups, dropdowns, websites, and so on.
- Style them thematically to match the theme (e.g., sleek for sci-fi, rustic for fantasy), ensuring text is visible.
- Embed all resources directly (e.g., inline SVGs) so nothing relies on external fonts or libraries.
- Place elements naturally in the narrative where characters would see or use them, with no limits on format or application.
- These HTML/CSS/JS elements must be rendered directly without enclosing them in code fences.`;
        }

        // Inject the plot prompt as a quiet prompt
        // This replaces the default continuation message
        setExtensionPrompt('rpg-plot-progression', prompt, extension_prompt_types.IN_CHAT, 0, false, extension_prompt_roles.USER);

        // Trigger a continuation with the custom prompt
        // The quiet_prompt parameter allows extension prompts to override the default continuation message
        // Since extensionSettings.enabled = false, onGenerationStarted won't inject RPG prompts
        // Check if Generate function exists (newer versions only)
        if (typeof window.Generate === 'function') {
            await window.Generate('continue', { quiet_prompt: prompt });
        } else {
            // Fallback for older versions - use generateRaw
            await generateRaw(prompt, '', false, false, '');
        }

        // Clear the temporary prompt after generation
        setExtensionPrompt('rpg-plot-progression', '', extension_prompt_types.IN_CHAT, 0, false);

        // console.log('[RPG Companion] Plot progression generation triggered');
    } catch (error) {
        console.error('[RPG Companion] Error sending plot progression:', error);
        // Clear the prompt in case of error
        setExtensionPrompt('rpg-plot-progression', '', extension_prompt_types.IN_CHAT, 0, false);
    } finally {
        // Restore original enabled state
        extensionSettings.enabled = wasEnabled;

        // Re-enable buttons
        $('#rpg-plot-random, #rpg-plot-natural').prop('disabled', false).css('opacity', '1');
    }
}

/**
 * Sets up the dice roller functionality.
 */
function setupDiceRoller() {
    // Click dice display to open popup
    $('#rpg-dice-display').on('click', function() {
        openDicePopup();
    });

    // Close popup
    $('#rpg-dice-popup-close, .rpg-dice-popup-overlay').on('click', function() {
        closeDicePopup();
    });

    // Roll dice button
    $('#rpg-dice-roll-btn').on('click', async function() {
        await rollDice();
    });

    // Save roll button (closes popup)
    $('#rpg-dice-save-btn').on('click', function() {
        closeDicePopup();
    });

    // Reset on Enter key
    $('#rpg-dice-count, #rpg-dice-sides').on('keypress', function(e) {
        if (e.which === 13) {
            rollDice();
        }
    });

    // Clear dice roll button
    $('#rpg-clear-dice').on('click', function(e) {
        e.stopPropagation(); // Prevent opening the dice popup
        clearDiceRoll();
    });
}

/**
 * Clears the last dice roll.
 */
function clearDiceRoll() {
    extensionSettings.lastDiceRoll = null;
    saveSettings();
    updateDiceDisplay();
}

/**
 * Opens the dice rolling popup.
 */
function openDicePopup() {
    // Apply current theme to popup
    const theme = extensionSettings.theme;
    $('#rpg-dice-popup').attr('data-theme', theme);

    $('#rpg-dice-popup').fadeIn(200);
    $('#rpg-dice-animation').hide();
    $('#rpg-dice-result').hide();
    $('#rpg-dice-roll-btn').show();

    // Apply custom theme if selected
    if (theme === 'custom') {
        applyCustomThemeToPopup();
    }
}

/**
 * Applies custom theme colors to the dice popup.
 */
function applyCustomThemeToPopup() {
    const $popup = $('#rpg-dice-popup');
    $popup.find('.rpg-dice-popup-content').css({
        '--rpg-bg': extensionSettings.customColors.bg,
        '--rpg-accent': extensionSettings.customColors.accent,
        '--rpg-text': extensionSettings.customColors.text,
        '--rpg-highlight': extensionSettings.customColors.highlight
    });
}

/**
 * Closes the dice rolling popup.
 */
function closeDicePopup() {
    $('#rpg-dice-popup').fadeOut(200);
}

/**
 * Rolls the dice and displays result.
 */
async function rollDice() {
    const count = parseInt(String($('#rpg-dice-count').val())) || 1;
    const sides = parseInt(String($('#rpg-dice-sides').val())) || 20;

    // Hide roll button and show animation
    $('#rpg-dice-roll-btn').hide();
    $('#rpg-dice-animation').show();
    $('#rpg-dice-result').hide();

    // Wait for animation (simulate rolling)
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Execute /roll command
    const rollCommand = `/roll ${count}d${sides}`;
    const rollResult = await executeRollCommand(rollCommand);

    // Parse result
    const total = rollResult.total || 0;
    const rolls = rollResult.rolls || [];

    // Store result
    extensionSettings.lastDiceRoll = {
        formula: `${count}d${sides}`,
        total: total,
        rolls: rolls,
        timestamp: Date.now()
    };
    saveSettings();

    // Hide animation and show result
    $('#rpg-dice-animation').hide();
    $('#rpg-dice-result').show();
    $('#rpg-dice-result-value').text(total);

    if (rolls.length > 1) {
        $('#rpg-dice-result-details').text(`Rolls: ${rolls.join(', ')}`);
    } else {
        $('#rpg-dice-result-details').text('');
    }

    // Update sidebar display
    updateDiceDisplay();
}

/**
 * Executes a /roll command and returns the result.
 */
async function executeRollCommand(command) {
    try {
        // Parse the dice notation (e.g., "2d20")
        const match = command.match(/(\d+)d(\d+)/);
        if (!match) {
            return { total: 0, rolls: [] };
        }

        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        const rolls = [];
        let total = 0;

        for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            total += roll;
        }

        return { total, rolls };
    } catch (error) {
        console.error('[RPG Companion] Error rolling dice:', error);
        return { total: 0, rolls: [] };
    }
}

/**
 * Updates the dice display in the sidebar.
 */
function updateDiceDisplay() {
    const lastRoll = extensionSettings.lastDiceRoll;
    if (lastRoll) {
        $('#rpg-last-roll-text').text(`Last Roll (${lastRoll.formula}): ${lastRoll.total}`);
    } else {
        $('#rpg-last-roll-text').text('Last Roll: None');
    }
}

/**
 * Adds the Roll Dice quick reply button.
 */
function addDiceQuickReply() {
    // Create quick reply button if Quick Replies exist
    if (window.quickReplyApi) {
        // Quick Reply API integration would go here
        // For now, the dice display in the sidebar serves as the button
    }
}

/**
 * Opens the settings popup.
 */
function openSettingsPopup() {
    const theme = extensionSettings.theme || 'default';
    $('#rpg-settings-popup').attr('data-theme', theme);

    // Apply custom theme colors if custom theme is selected
    if (theme === 'custom') {
        applyCustomThemeToSettingsPopup();
    }

    $('#rpg-settings-popup').fadeIn(200);
}

/**
 * Closes the settings popup.
 */
function closeSettingsPopup() {
    $('#rpg-settings-popup').fadeOut(200);
}

/**
 * Applies custom theme colors to the settings popup.
 */
function applyCustomThemeToSettingsPopup() {
    const popup = $('#rpg-settings-popup .rpg-settings-popup-content');
    popup.css({
        '--rpg-bg': extensionSettings.customColors.bg,
        '--rpg-accent': extensionSettings.customColors.accent,
        '--rpg-text': extensionSettings.customColors.text,
        '--rpg-highlight': extensionSettings.customColors.highlight
    });
}

/**
 * Updates the settings popup theme in real-time.
 */
function updateSettingsPopupTheme() {
    const theme = extensionSettings.theme || 'default';
    const popup = $('#rpg-settings-popup .rpg-settings-popup-content');

    $('#rpg-settings-popup').attr('data-theme', theme);

    // Apply custom theme colors if custom theme is selected
    if (theme === 'custom') {
        applyCustomThemeToSettingsPopup();
    } else {
        // Clear custom CSS variables to let theme CSS take over
        popup.css({
            '--rpg-bg': '',
            '--rpg-accent': '',
            '--rpg-text': '',
            '--rpg-highlight': ''
        });
    }
}

/**
 * Sets up the settings popup functionality.
 */
function setupSettingsPopup() {
    // Open settings popup
    $('#rpg-open-settings').on('click', function() {
        openSettingsPopup();
    });

    // Close settings popup
    $('#rpg-close-settings, .rpg-settings-popup-overlay').on('click', function() {
        closeSettingsPopup();
    });

    // Clear cache button
    $('#rpg-clear-cache').on('click', function() {
        if (confirm('Are you sure you want to clear all cached RPG data for this chat? This will reset Stats, Info Box, and Mind Reading.')) {
            // Clear the data
            lastGeneratedData.userStats = null;
            lastGeneratedData.infoBox = null;
            lastGeneratedData.characterThoughts = null;

            // Clear committed tracker data (used for generation context)
            committedTrackerData.userStats = null;
            committedTrackerData.infoBox = null;
            committedTrackerData.characterThoughts = null;

            // Clear all message swipe data
            const chat = getContext().chat;
            if (chat && chat.length > 0) {
                for (let i = 0; i < chat.length; i++) {
                    const message = chat[i];
                    if (message.extra && message.extra.rpg_companion_swipes) {
                        delete message.extra.rpg_companion_swipes;
                        // console.log('[RPG Companion] Cleared swipe data from message at index', i);
                    }
                }
            }

            // Clear the UI
            if ($infoBoxContainer) {
                $infoBoxContainer.empty();
            }
            if ($thoughtsContainer) {
                $thoughtsContainer.empty();
            }

            // Reset stats to defaults and re-render
            extensionSettings.userStats = {
                health: 100,
                sustenance: 100,
                energy: 100,
                hygiene: 100,
                arousal: 0,
                mood: '😐',
                conditions: 'None',
                inventory: 'None'
            };

            // Reset classic stats (attributes) to defaults
            extensionSettings.classicStats = {
                str: 10,
                dex: 10,
                con: 10,
                int: 10,
                wis: 10,
                cha: 10
            };

            // Clear dice roll
            extensionSettings.lastDiceRoll = null;

            // Save everything
            saveChatData();
            saveSettings();

            // Re-render user stats and dice display
            renderUserStats();
            updateDiceDisplay();
            updateChatThoughts(); // Clear the thought bubble in chat

            // console.log('[RPG Companion] Chat cache cleared');
            alert('Chat cache cleared successfully!');
        }
    });
}

/**
 * Updates the visibility of the entire panel.
 */
function updatePanelVisibility() {
    if (extensionSettings.enabled) {
        $panelContainer.show();
        togglePlotButtons(); // Update plot button visibility
    } else {
        $panelContainer.hide();
        $('#rpg-plot-buttons').hide(); // Hide plot buttons when disabled
    }
}

/**
 * Clears all extension prompts.
 */
function clearExtensionPrompts() {
    setExtensionPrompt('rpg-companion-inject', '', extension_prompt_types.IN_CHAT, 0, false);
    setExtensionPrompt('rpg-companion-example', '', extension_prompt_types.IN_CHAT, 0, false);
    setExtensionPrompt('rpg-companion-html', '', extension_prompt_types.IN_CHAT, 0, false);
    setExtensionPrompt('rpg-companion-context', '', extension_prompt_types.IN_CHAT, 1, false);
    // console.log('[RPG Companion] Cleared all extension prompts');
}

/**
 * Updates the visibility of individual sections.
 */
function updateSectionVisibility() {
    // Show/hide sections based on settings
    $userStatsContainer.toggle(extensionSettings.showUserStats);
    $infoBoxContainer.toggle(extensionSettings.showInfoBox);
    $thoughtsContainer.toggle(extensionSettings.showCharacterThoughts);

    // Show/hide dividers intelligently
    // Divider after User Stats: shown if User Stats is visible AND at least one section after it is visible
    const showDividerAfterStats = extensionSettings.showUserStats &&
        (extensionSettings.showInfoBox || extensionSettings.showCharacterThoughts);
    $('#rpg-divider-stats').toggle(showDividerAfterStats);

    // Divider after Info Box: shown if Info Box is visible AND Mind Reading is visible
    const showDividerAfterInfo = extensionSettings.showInfoBox &&
        extensionSettings.showCharacterThoughts;
    $('#rpg-divider-info').toggle(showDividerAfterInfo);
}

/**
 * Applies the selected panel position.
 */
function applyPanelPosition() {
    if (!$panelContainer) return;

    // Remove all position classes
    $panelContainer.removeClass('rpg-position-left rpg-position-right rpg-position-top');

    // Add the appropriate position class
    $panelContainer.addClass(`rpg-position-${extensionSettings.panelPosition}`);
}

/**
 * Updates the model selector visibility.
 */
/**
 * Updates the UI based on generation mode selection.
 */
function updateGenerationModeUI() {
    if (extensionSettings.generationMode === 'together') {
        // In "together" mode, manual update button is hidden
        $('#rpg-manual-update').hide();
    } else {
        // In "separate" mode, manual update button is visible
        $('#rpg-manual-update').show();
    }
}

/**
 * Generates just the example portion - previous tracker data without tags or explanations.
 * This will be appended to the last assistant message to show the format.
 * Each section is wrapped in markdown code blocks.
 */
function generateTrackerExample() {
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
 * @param {boolean} includeHtmlPrompt - Whether to include the HTML prompt (true for main generation, false for separate tracker generation)
 * @param {boolean} includeContinuation - Whether to include "After updating the trackers, continue..." instruction
 */
function generateTrackerInstructions(includeHtmlPrompt = true, includeContinuation = true) {
    const userName = getContext().name1;
    const classicStats = extensionSettings.classicStats;
    let instructions = '';

    // Check if any trackers are enabled
    const hasAnyTrackers = extensionSettings.showUserStats || extensionSettings.showInfoBox || extensionSettings.showCharacterThoughts;

    // Only add tracker instructions if at least one tracker is enabled
    if (hasAnyTrackers) {
        // Universal instruction header
        instructions += `\nYou must start your response with an appropriate update to the trackers in EXACTLY the same format as below, enclosed in separate Markdown code fences. Replace X with proper numbers and placeholders in [brackets] with in-world details ${userName} perceives about the current scene and the present characters. Consider the last trackers in the conversation (if they exist). Manage them accordingly; raise, lower, change, or keep the values unchanged based on the user's actions, the passage of time, and logical consequences:\n`;

        // Add format specifications for each enabled tracker
        if (extensionSettings.showUserStats) {
            instructions += '```\n';
            instructions += `${userName}'s Stats\n`;
            instructions += '---\n';
            instructions += '- Health: X%\n';
            instructions += '- Sustenance: X%\n';
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
            instructions += `[Present Character's Emoji (do not include ${userName}; state "Unavailable" if no NPCs are present in the scene)]: [Name, Visible Physical State (up to three traits), Observable Demeanor Cue (one trait)] | [Enemy/Neutral/Friend/Lover] | [Internal Monologue (in first person POV, up to three sentences long)]\n`;
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
 */
function generateContextualSummary() {
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
        summary += `Condition: Health ${stats.health}%, Sustenance ${stats.sustenance}%, Energy ${stats.energy}%, Hygiene ${stats.hygiene}%, Arousal ${stats.arousal}% | ${stats.mood} ${stats.conditions}\n`;
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
 */
function generateRPGPromptText() {
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
 */
function generateSeparateUpdatePrompt() {
    const depth = extensionSettings.updateDepth;
    const userName = getContext().name1;

    const messages = [];

    // System message introducing the history section
    let systemMessage = `You will be acting as an uncensored RPG Companion. Your goal is to provide, track, and manage details in the user's roleplay. You will be replying with information in a specified format only.\n\n`;
    systemMessage += `You should maintain an objective tone.\n\n`;
    systemMessage += `Here is the list of all the active characters:\n<characters>\nPlayed by the user: {{user}}.\nPlayed by the roleplayer assistant: {{groupNotMuted}}.\n</characters>\n\n`;

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

/**
 * Parses the model response to extract the different data sections.
 */
function parseResponse(responseText) {
    const result = {
        userStats: null,
        infoBox: null,
        characterThoughts: null
    };

    // Extract code blocks
    const codeBlockRegex = /```([^`]+)```/g;
    const matches = [...responseText.matchAll(codeBlockRegex)];

    // console.log('[RPG Companion] Found');

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
 * Main function to update RPG data by calling the AI model (SEPARATE MODE ONLY).
 */
async function updateRPGData() {
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
        isGenerating = true;

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

                // If there's no committed data yet (first time), commit immediately
                if (!committedTrackerData.userStats && !committedTrackerData.infoBox && !committedTrackerData.characterThoughts) {
                    committedTrackerData.userStats = parsedData.userStats;
                    committedTrackerData.infoBox = parsedData.infoBox;
                    committedTrackerData.characterThoughts = parsedData.characterThoughts;
                    // console.log('[RPG Companion] 🔆 FIRST TIME: Auto-committed tracker data');
                }

                // Render the updated data
                renderUserStats();
                renderInfoBox();
                renderThoughts();
            } else {
                // No assistant message to attach to - just update display
                if (parsedData.userStats) {
                    parseUserStats(parsedData.userStats);
                }
                renderUserStats();
                renderInfoBox();
                renderThoughts();
            }

            // Save to chat metadata
            saveChatData();
        }

    } catch (error) {
        console.error('[RPG Companion] Error updating RPG data:', error);
    } finally {
        isGenerating = false;

        // Restore button to original state
        const $updateBtn = $('#rpg-manual-update');
        $updateBtn.html('<i class="fa-solid fa-sync"></i> Refresh RPG Info').prop('disabled', false);

        // Reset the flag after tracker generation completes
        // This ensures the flag persists through both main generation AND tracker generation
        // console.log('[RPG Companion] 🔄 Tracker generation complete - resetting lastActionWasSwipe to false');
        lastActionWasSwipe = false;
    }
}

/**
 * Parses user stats from the text and updates the settings.
 */
function parseUserStats(statsText) {
    try {
        // Extract percentages and mood/conditions
        const healthMatch = statsText.match(/Health:\s*(\d+)%/);
        const sustenanceMatch = statsText.match(/Sustenance:\s*(\d+)%/);
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
        if (sustenanceMatch) extensionSettings.userStats.sustenance = parseInt(sustenanceMatch[1]);
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
 * Renders the user stats with fancy progress bars.
 */
/**
 * Renders the user stats with fancy progress bars.
 */
function renderUserStats() {
    if (!extensionSettings.showUserStats || !$userStatsContainer) {
        return;
    }

    const stats = extensionSettings.userStats;
    const userName = getContext().name1;

    // Get user portrait
    const userPortrait = getThumbnailUrl('persona', user_avatar);

    // Create gradient from low to high color
    const gradient = `linear-gradient(to right, ${extensionSettings.statBarColorLow}, ${extensionSettings.statBarColorHigh})`;

    const html = `
        <div class="rpg-stats-header">
            <div class="rpg-stats-header-left">
                <img src="${userPortrait}" alt="${userName}" class="rpg-user-portrait" onerror="this.src='img/user-default.png'" />
                <div class="rpg-stats-title">${userName}</div>
            </div>
            <div class="rpg-inventory-box">
                <div class="rpg-inventory-items rpg-editable" contenteditable="true" data-field="inventory" title="Click to edit">
                    ${stats.inventory || 'None'}
                </div>
            </div>
        </div>

        <div class="rpg-stats-content">
            <div class="rpg-stats-left">
                <div class="rpg-stats-grid">
                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Health:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.health}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="health" title="Click to edit">${stats.health}%</span>
                    </div>

                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Sustenance:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.sustenance}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="sustenance" title="Click to edit">${stats.sustenance}%</span>
                    </div>

                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Energy:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.energy}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="energy" title="Click to edit">${stats.energy}%</span>
                    </div>

                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Hygiene:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.hygiene}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="hygiene" title="Click to edit">${stats.hygiene}%</span>
                    </div>

                    <div class="rpg-stat-row">
                        <span class="rpg-stat-label">Arousal:</span>
                        <div class="rpg-stat-bar" style="background: ${gradient}">
                            <div class="rpg-stat-fill" style="width: ${100 - stats.arousal}%"></div>
                        </div>
                        <span class="rpg-stat-value rpg-editable-stat" contenteditable="true" data-field="arousal" title="Click to edit">${stats.arousal}%</span>
                    </div>
                </div>

                <div class="rpg-mood">
                    <div class="rpg-mood-emoji rpg-editable" contenteditable="true" data-field="mood" title="Click to edit emoji">${stats.mood}</div>
                    <div class="rpg-mood-conditions rpg-editable" contenteditable="true" data-field="conditions" title="Click to edit conditions">${stats.conditions}</div>
                </div>
            </div>

            <div class="rpg-stats-right">
                <div class="rpg-classic-stats">
                    <div class="rpg-classic-stats-grid">
                        <div class="rpg-classic-stat" data-stat="str">
                            <span class="rpg-classic-stat-label">STR</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="str">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.str}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="str">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="dex">
                            <span class="rpg-classic-stat-label">DEX</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="dex">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.dex}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="dex">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="con">
                            <span class="rpg-classic-stat-label">CON</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="con">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.con}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="con">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="int">
                            <span class="rpg-classic-stat-label">INT</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="int">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.int}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="int">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="wis">
                            <span class="rpg-classic-stat-label">WIS</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="wis">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.wis}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="wis">+</button>
                            </div>
                        </div>
                        <div class="rpg-classic-stat" data-stat="cha">
                            <span class="rpg-classic-stat-label">CHA</span>
                            <div class="rpg-classic-stat-buttons">
                                <button class="rpg-classic-stat-btn rpg-stat-decrease" data-stat="cha">−</button>
                                <span class="rpg-classic-stat-value">${extensionSettings.classicStats.cha}</span>
                                <button class="rpg-classic-stat-btn rpg-stat-increase" data-stat="cha">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    $userStatsContainer.html(html);

    // Add event listeners for classic stat buttons
    $('.rpg-stat-increase').on('click', function() {
        const stat = $(this).data('stat');
        if (extensionSettings.classicStats[stat] < 20) {
            extensionSettings.classicStats[stat]++;
            saveSettings();
            saveChatData();
            // Update only the specific stat value, not the entire stats panel
            $(this).closest('.rpg-classic-stat').find('.rpg-classic-stat-value').text(extensionSettings.classicStats[stat]);
        }
    });

    $('.rpg-stat-decrease').on('click', function() {
        const stat = $(this).data('stat');
        if (extensionSettings.classicStats[stat] > 1) {
            extensionSettings.classicStats[stat]--;
            saveSettings();
            saveChatData();
            // Update only the specific stat value, not the entire stats panel
            $(this).closest('.rpg-classic-stat').find('.rpg-classic-stat-value').text(extensionSettings.classicStats[stat]);
        }
    });

    // Add event listeners for editable stat values
    $('.rpg-editable-stat').on('blur', function() {
        const field = $(this).data('field');
        const textValue = $(this).text().replace('%', '').trim();
        let value = parseInt(textValue);

        // Validate and clamp value between 0 and 100
        if (isNaN(value)) {
            value = 0;
        }
        value = Math.max(0, Math.min(100, value));

        // Update the setting
        extensionSettings.userStats[field] = value;

        // Also update lastGeneratedData to keep it in sync
        if (!lastGeneratedData.userStats) {
            lastGeneratedData.userStats = '';
        }
        // Regenerate the userStats text with updated value
        const statsText = `Health: ${extensionSettings.userStats.health}%\nSustenance: ${extensionSettings.userStats.sustenance}%\nEnergy: ${extensionSettings.userStats.energy}%\nHygiene: ${extensionSettings.userStats.hygiene}%\nArousal: ${extensionSettings.userStats.arousal}%\n${extensionSettings.userStats.mood}: ${extensionSettings.userStats.conditions}\nInventory: ${extensionSettings.userStats.inventory}`;
        lastGeneratedData.userStats = statsText;

        saveSettings();
        saveChatData();
        updateMessageSwipeData();

        // Re-render to update the bar
        renderUserStats();
    });

    // Add event listener for inventory editing
    $('.rpg-inventory-items.rpg-editable').on('blur', function() {
        const value = $(this).text().trim();
        extensionSettings.userStats.inventory = value || 'None';

        // Update lastGeneratedData
        const statsText = `Health: ${extensionSettings.userStats.health}%\nSustenance: ${extensionSettings.userStats.sustenance}%\nEnergy: ${extensionSettings.userStats.energy}%\nHygiene: ${extensionSettings.userStats.hygiene}%\nArousal: ${extensionSettings.userStats.arousal}%\n${extensionSettings.userStats.mood}: ${extensionSettings.userStats.conditions}\nInventory: ${extensionSettings.userStats.inventory}`;
        lastGeneratedData.userStats = statsText;

        saveSettings();
        saveChatData();
        updateMessageSwipeData();
    });

    // Add event listeners for mood/conditions editing
    $('.rpg-mood-emoji.rpg-editable').on('blur', function() {
        const value = $(this).text().trim();
        extensionSettings.userStats.mood = value || '😐';

        // Update lastGeneratedData
        const statsText = `Health: ${extensionSettings.userStats.health}%\nSustenance: ${extensionSettings.userStats.sustenance}%\nEnergy: ${extensionSettings.userStats.energy}%\nHygiene: ${extensionSettings.userStats.hygiene}%\nArousal: ${extensionSettings.userStats.arousal}%\n${extensionSettings.userStats.mood}: ${extensionSettings.userStats.conditions}\nInventory: ${extensionSettings.userStats.inventory}`;
        lastGeneratedData.userStats = statsText;

        saveSettings();
        saveChatData();
        updateMessageSwipeData();
    });

    $('.rpg-mood-conditions.rpg-editable').on('blur', function() {
        const value = $(this).text().trim();
        extensionSettings.userStats.conditions = value || 'None';

        // Update lastGeneratedData
        const statsText = `Health: ${extensionSettings.userStats.health}%\nSustenance: ${extensionSettings.userStats.sustenance}%\nEnergy: ${extensionSettings.userStats.energy}%\nHygiene: ${extensionSettings.userStats.hygiene}%\nArousal: ${extensionSettings.userStats.arousal}%\n${extensionSettings.userStats.mood}: ${extensionSettings.userStats.conditions}\nInventory: ${extensionSettings.userStats.inventory}`;
        lastGeneratedData.userStats = statsText;

        saveSettings();
        saveChatData();
        updateMessageSwipeData();
    });
}

/**
 * Renders the info box as a visual dashboard.
 */
function renderInfoBox() {
    if (!extensionSettings.showInfoBox || !$infoBoxContainer) {
        return;
    }

    // Add updating class for animation
    if (extensionSettings.enableAnimations) {
        $infoBoxContainer.addClass('rpg-content-updating');
    }

    // If no data yet, show placeholder
    if (!lastGeneratedData.infoBox) {
        const placeholderHtml = `
            <div class="rpg-dashboard rpg-dashboard-row-1">
                <div class="rpg-dashboard-widget rpg-placeholder-widget">
                    <div class="rpg-placeholder-text">No data yet</div>
                    <div class="rpg-placeholder-hint">Click "Refresh RPG Info" to generate</div>
                </div>
            </div>
        `;
        $infoBoxContainer.html(placeholderHtml);
        if (extensionSettings.enableAnimations) {
            setTimeout(() => $infoBoxContainer.removeClass('rpg-content-updating'), 500);
        }
        return;
    }

    // console.log('[RPG Companion] renderInfoBox called with data:', lastGeneratedData.infoBox);

    // Parse the info box data
    const lines = lastGeneratedData.infoBox.split('\n');
    // console.log('[RPG Companion] Info Box split into lines:', lines);
    const data = {
        date: '',
        weekday: '',
        month: '',
        year: '',
        weatherEmoji: '',
        weatherForecast: '',
        temperature: '',
        tempValue: 0,
        timeStart: '',
        timeEnd: '',
        location: '',
        characters: []
    };

    for (const line of lines) {
        // console.log('[RPG Companion] Processing line:', line);

        if (line.includes('🗓️:')) {
            // console.log('[RPG Companion] → Matched DATE');
            const dateStr = line.replace('🗓️:', '').trim();
            // Parse format: "Weekday, Month Day, Year" or "Weekday, Month, Year"
            const dateParts = dateStr.split(',').map(p => p.trim());
            data.weekday = dateParts[0] || '';
            data.month = dateParts[1] || '';
            data.year = dateParts[2] || '';
            data.date = dateStr;
        } else if (line.includes('🌡️:')) {
            // console.log('[RPG Companion] → Matched TEMPERATURE');
            const tempStr = line.replace('🌡️:', '').trim();
            data.temperature = tempStr;
            // Extract numeric value
            const tempMatch = tempStr.match(/(-?\d+)/);
            if (tempMatch) {
                data.tempValue = parseInt(tempMatch[1]);
            }
        } else if (line.includes('🕒:')) {
            // console.log('[RPG Companion] → Matched TIME');
            const timeStr = line.replace('🕒:', '').trim();
            data.time = timeStr;
            // Parse "HH:MM → HH:MM" format
            const timeParts = timeStr.split('→').map(t => t.trim());
            data.timeStart = timeParts[0] || '';
            data.timeEnd = timeParts[1] || '';
        } else if (line.includes('🗺️:')) {
            // console.log('[RPG Companion] → Matched LOCATION');
            data.location = line.replace('🗺️:', '').trim();
        } else {
            // Check if it's a weather line
            // Since \p{Emoji} doesn't work reliably, use a simpler approach
            const hasColon = line.includes(':');
            const notInfoBox = !line.includes('Info Box');
            const notDivider = !line.includes('---');
            const notCodeFence = !line.trim().startsWith('```');

            // console.log('[RPG Companion] → Checking weather conditions:', {
            //     line: line,
            //     hasColon: hasColon,
            //     notInfoBox: notInfoBox,
            //     notDivider: notDivider
            // });

            if (hasColon && notInfoBox && notDivider && notCodeFence && line.trim().length > 0) {
                // Match format: [Weather Emoji]: [Forecast]
                // Capture everything before colon as emoji, everything after as forecast
                // console.log('[RPG Companion] → Testing WEATHER match for:', line);
                const weatherMatch = line.match(/^\s*([^:]+):\s*(.+)$/);
                if (weatherMatch) {
                    const potentialEmoji = weatherMatch[1].trim();
                    const forecast = weatherMatch[2].trim();

                    // If the first part is short (likely emoji), treat as weather
                    if (potentialEmoji.length <= 5) {
                        data.weatherEmoji = potentialEmoji;
                        data.weatherForecast = forecast;
                        // console.log('[RPG Companion] ✓ Weather parsed:', data.weatherEmoji, data.weatherForecast);
                    } else {
                        // console.log('[RPG Companion] ✗ First part too long for emoji:', potentialEmoji);
                    }
                } else {
                    // console.log('[RPG Companion] ✗ Weather regex did not match');
                }
            } else {
                // console.log('[RPG Companion] → No match for this line');
            }
        }
    }

    // console.log('[RPG Companion] Parsed Info Box data:', {
    //     date: data.date,
    //     weatherEmoji: data.weatherEmoji,
    //     weatherForecast: data.weatherForecast,
    //     temperature: data.temperature,
    //     timeStart: data.timeStart,
    //     location: data.location
    // });

    // Build visual dashboard HTML
    // Row 1: Date, Weather, Temperature, Time widgets
    let html = '<div class="rpg-dashboard rpg-dashboard-row-1">';

    // Calendar widget - actual visual calendar
    if (data.date) {
        const monthShort = data.month.substring(0, 3).toUpperCase();
        const weekdayShort = data.weekday.substring(0, 3).toUpperCase();
        html += `
            <div class="rpg-dashboard-widget rpg-calendar-widget">
                <div class="rpg-calendar-top rpg-editable" contenteditable="true" data-field="month" title="Click to edit">${monthShort}</div>
                <div class="rpg-calendar-day rpg-editable" contenteditable="true" data-field="weekday" title="Click to edit">${weekdayShort}</div>
                <div class="rpg-calendar-year rpg-editable" contenteditable="true" data-field="year" title="Click to edit">${data.year}</div>
            </div>
        `;
    }

    // Weather widget - emoji with forecast text
    if (data.weatherEmoji) {
        html += `
            <div class="rpg-dashboard-widget rpg-weather-widget">
                <div class="rpg-weather-icon rpg-editable" contenteditable="true" data-field="weatherEmoji" title="Click to edit emoji">${data.weatherEmoji}</div>
                ${data.weatherForecast ? `<div class="rpg-weather-forecast rpg-editable" contenteditable="true" data-field="weatherForecast" title="Click to edit">${data.weatherForecast}</div>` : ''}
            </div>
        `;
    }

    // Temperature widget - thermometer visual
    if (data.temperature) {
        const tempPercent = Math.min(100, Math.max(0, ((data.tempValue + 20) / 60) * 100));
        const tempColor = data.tempValue < 10 ? '#4a90e2' : data.tempValue < 25 ? '#67c23a' : '#e94560';
        html += `
            <div class="rpg-dashboard-widget rpg-temp-widget">
                <div class="rpg-thermometer">
                    <div class="rpg-thermometer-bulb"></div>
                    <div class="rpg-thermometer-tube">
                        <div class="rpg-thermometer-fill" style="height: ${tempPercent}%; background: ${tempColor}"></div>
                    </div>
                </div>
                <div class="rpg-temp-value rpg-editable" contenteditable="true" data-field="temperature" title="Click to edit">${data.temperature}</div>
            </div>
        `;
    }

    // Time widget - clock visual
    if (data.timeStart) {
        // Parse time for clock hands
        const timeMatch = data.timeStart.match(/(\d+):(\d+)/);
        let hourAngle = 0;
        let minuteAngle = 0;
        if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            hourAngle = (hours % 12) * 30 + minutes * 0.5; // 30° per hour + 0.5° per minute
            minuteAngle = minutes * 6; // 6° per minute
        }
        html += `
            <div class="rpg-dashboard-widget rpg-clock-widget">
                <div class="rpg-clock">
                    <div class="rpg-clock-face">
                        <div class="rpg-clock-hour" style="transform: rotate(${hourAngle}deg)"></div>
                        <div class="rpg-clock-minute" style="transform: rotate(${minuteAngle}deg)"></div>
                        <div class="rpg-clock-center"></div>
                    </div>
                </div>
                <div class="rpg-time-value rpg-editable" contenteditable="true" data-field="timeStart" title="Click to edit">${data.timeStart}</div>
            </div>
        `;
    }

    html += '</div>';

    // Row 2: Location widget (full width)
    if (data.location) {
        html += `
            <div class="rpg-dashboard rpg-dashboard-row-2">
                <div class="rpg-dashboard-widget rpg-location-widget">
                    <div class="rpg-map-bg">
                        <div class="rpg-map-marker">📍</div>
                    </div>
                    <div class="rpg-location-text rpg-editable" contenteditable="true" data-field="location" title="Click to edit">${data.location}</div>
                </div>
            </div>
        `;
    }

    $infoBoxContainer.html(html);

    // Add event handlers for editable Info Box fields
    $infoBoxContainer.find('.rpg-editable').on('blur', function() {
        const field = $(this).data('field');
        const value = $(this).text().trim();
        updateInfoBoxField(field, value);
    });

    // Remove updating class after animation
    if (extensionSettings.enableAnimations) {
        setTimeout(() => $infoBoxContainer.removeClass('rpg-content-updating'), 500);
    }
}

/**
 * Renders character thoughts (Present Characters).
 */
function renderThoughts() {
    if (!extensionSettings.showCharacterThoughts || !$thoughtsContainer) {
        return;
    }

    // Add updating class for animation
    if (extensionSettings.enableAnimations) {
        $thoughtsContainer.addClass('rpg-content-updating');
    }

    // If no data yet, show placeholder
    if (!lastGeneratedData.characterThoughts) {
        const placeholderHtml = `
            <div class="rpg-thoughts-content">
                <div class="rpg-thoughts-placeholder">
                    <div class="rpg-placeholder-text">No characters detected</div>
                    <div class="rpg-placeholder-hint">Click "Refresh RPG Info" to generate</div>
                </div>
            </div>
        `;
        $thoughtsContainer.html(placeholderHtml);
        if (extensionSettings.enableAnimations) {
            setTimeout(() => $thoughtsContainer.removeClass('rpg-content-updating'), 600);
        }
        return;
    }

    const lines = lastGeneratedData.characterThoughts.split('\n');
    const presentCharacters = [];

    // console.log('[RPG Companion] Raw Present Characters:', lastGeneratedData.characterThoughts);
    // console.log('[RPG Companion] Split into lines:', lines);

    // Parse format: [Emoji]: [Name, Status, Demeanor] | [Relationship] | [Thoughts]
    for (const line of lines) {
        // Skip empty lines, headers, dividers, and code fences
        if (line.trim() &&
            !line.includes('Present Characters') &&
            !line.includes('---') &&
            !line.trim().startsWith('```')) {

            // Match the new format with pipes
            const parts = line.split('|').map(p => p.trim());

            if (parts.length >= 2) {
                // First part: [Emoji]: [Name, Status, Demeanor]
                const firstPart = parts[0].trim();
                const emojiMatch = firstPart.match(/^(.+?):\s*(.+)$/);

                if (emojiMatch) {
                    const emoji = emojiMatch[1].trim();
                    const info = emojiMatch[2].trim();
                    const relationship = parts[1].trim(); // Enemy/Neutral/Friend/Lover
                    const thoughts = parts[2] ? parts[2].trim() : '';

                    // Parse name from info (first part before comma)
                    const infoParts = info.split(',').map(p => p.trim());
                    const name = infoParts[0] || '';
                    const traits = infoParts.slice(1).join(', ');

                    if (name && name.toLowerCase() !== 'unavailable') {
                        presentCharacters.push({ emoji, name, traits, relationship, thoughts });
                        // console.log('[RPG Companion] Parsed character:', { name, relationship });
                    }
                }
            }
        }
    }

    // Relationship status to emoji mapping
    const relationshipEmojis = {
        'Enemy': '⚔️',
        'Neutral': '⚖️',
        'Friend': '⭐',
        'Lover': '❤️'
    };

    // Build HTML
    let html = '';

    // console.log('[RPG Companion] Total characters parsed:', presentCharacters.length);
    // console.log('[RPG Companion] Characters array:', presentCharacters);

    if (presentCharacters.length === 0) {
        html += '<div class="rpg-thoughts-content"><div class="rpg-thoughts-overlay"><span>Unavailable</span></div></div>';
    } else {
        html += '<div class="rpg-thoughts-content">';
        for (const char of presentCharacters) {
            // Find character portrait
            let characterPortrait = 'img/user-default.png';

            // console.log('[RPG Companion] Looking for avatar for:', char.name);

            // For group chats, search through group members first
            if (selected_group) {
                const groupMembers = getGroupMembers(selected_group);
                const matchingMember = groupMembers.find(member =>
                    member && member.name && member.name.toLowerCase() === char.name.toLowerCase()
                );

                if (matchingMember && matchingMember.avatar && matchingMember.avatar !== 'none') {
                    characterPortrait = getThumbnailUrl('avatar', matchingMember.avatar);
                }
            }

            // For regular chats or if not found in group, search all characters
            if (characterPortrait === 'img/user-default.png' && characters && characters.length > 0) {
                const matchingCharacter = characters.find(c =>
                    c && c.name && c.name.toLowerCase() === char.name.toLowerCase()
                );

                if (matchingCharacter && matchingCharacter.avatar && matchingCharacter.avatar !== 'none') {
                    characterPortrait = getThumbnailUrl('avatar', matchingCharacter.avatar);
                }
            }

            // If this is the current character in a 1-on-1 chat, use their portrait
            if (this_chid !== undefined && characters[this_chid] &&
                characters[this_chid].name && characters[this_chid].name.toLowerCase() === char.name.toLowerCase()) {
                characterPortrait = getThumbnailUrl('avatar', characters[this_chid].avatar);
            }

            // Get relationship emoji
            const relationshipEmoji = relationshipEmojis[char.relationship] || '⚖️';

            html += `
                <div class="rpg-character-card" data-character-name="${char.name}">
                    <div class="rpg-character-avatar">
                        <img src="${characterPortrait}" alt="${char.name}" onerror="this.src='img/user-default.png'" />
                        <div class="rpg-relationship-badge rpg-editable" contenteditable="true" data-character="${char.name}" data-field="relationship" title="Click to edit (use emoji: ⚔️ ⚖️ ⭐ ❤️)">${relationshipEmoji}</div>
                    </div>
                    <div class="rpg-character-info">
                        <div class="rpg-character-header">
                            <span class="rpg-character-emoji rpg-editable" contenteditable="true" data-character="${char.name}" data-field="emoji" title="Click to edit emoji">${char.emoji}</span>
                            <span class="rpg-character-name rpg-editable" contenteditable="true" data-character="${char.name}" data-field="name" title="Click to edit name">${char.name}</span>
                        </div>
                        <div class="rpg-character-traits rpg-editable" contenteditable="true" data-character="${char.name}" data-field="traits" title="Click to edit traits">${char.traits}</div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
    }

    $thoughtsContainer.html(html);

    // Add event handlers for editable character fields
    $thoughtsContainer.find('.rpg-editable').on('blur', function() {
        const character = $(this).data('character');
        const field = $(this).data('field');
        const value = $(this).text().trim();
        updateCharacterField(character, field, value);
    });

    // Remove updating class after animation
    if (extensionSettings.enableAnimations) {
        setTimeout(() => $thoughtsContainer.removeClass('rpg-content-updating'), 600);
    }

    // Update chat overlay if enabled
    if (extensionSettings.showThoughtsInChat) {
        updateChatThoughts();
    }
}

/**
 * Updates a specific field in the Info Box data and re-renders.
 */
function updateInfoBoxField(field, value) {
    if (!lastGeneratedData.infoBox) return;

    // Reconstruct the Info Box text with updated field
    const lines = lastGeneratedData.infoBox.split('\n');
    const updatedLines = lines.map(line => {
        if (field === 'month' && line.includes('🗓️:')) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                // parts[0] = "🗓️: Weekday", parts[1] = " Month", parts[2] = " Year"
                parts[1] = ' ' + value;
                return parts.join(',');
            }
        } else if (field === 'weekday' && line.includes('🗓️:')) {
            const parts = line.split(',');
            if (parts.length >= 1) {
                // Keep the emoji, just update the weekday
                parts[0] = '🗓️: ' + value;
                return parts.join(',');
            }
        } else if (field === 'year' && line.includes('🗓️:')) {
            const parts = line.split(',');
            if (parts.length >= 3) {
                parts[2] = ' ' + value;
                return parts.join(',');
            }
        } else if (field === 'weatherEmoji' && line.match(/^[^:]+:\s*.+$/) && !line.includes('🗓️') && !line.includes('🌡️') && !line.includes('🕒') && !line.includes('🗺️') && !line.includes('Info Box') && !line.includes('---')) {
            // This is the weather line
            const parts = line.split(':');
            if (parts.length >= 2) {
                return `${value}: ${parts.slice(1).join(':').trim()}`;
            }
        } else if (field === 'weatherForecast' && line.match(/^[^:]+:\s*.+$/) && !line.includes('🗓️') && !line.includes('🌡️') && !line.includes('🕒') && !line.includes('🗺️') && !line.includes('Info Box') && !line.includes('---')) {
            // This is the weather line
            const parts = line.split(':');
            if (parts.length >= 2) {
                return `${parts[0].trim()}: ${value}`;
            }
        } else if (field === 'temperature' && line.includes('🌡️:')) {
            return `🌡️: ${value}`;
        } else if (field === 'timeStart' && line.includes('🕒:')) {
            // Update time format: "HH:MM → HH:MM"
            const currentTime = line.replace('🕒:', '').trim();
            const timeParts = currentTime.split('→').map(t => t.trim());
            const timeEnd = timeParts[1] || timeParts[0]; // Keep end time or use start as both
            return `🕒: ${value} → ${timeEnd}`;
        } else if (field === 'location' && line.includes('🗺️:')) {
            return `🗺️: ${value}`;
        }
        return line;
    });

    lastGeneratedData.infoBox = updatedLines.join('\n');

    // Update the message's swipe data
    const chat = getContext().chat;
    if (chat && chat.length > 0) {
        for (let i = chat.length - 1; i >= 0; i--) {
            const message = chat[i];
            if (!message.is_user) {
                if (message.extra && message.extra.rpg_companion_swipes) {
                    const swipeId = message.swipe_id || 0;
                    if (message.extra.rpg_companion_swipes[swipeId]) {
                        message.extra.rpg_companion_swipes[swipeId].infoBox = updatedLines.join('\n');
                        // console.log('[RPG Companion] Updated infoBox in message swipe data');
                    }
                }
                break;
            }
        }
    }

    saveChatData();
    renderInfoBox();
}

/**
 * Updates a specific character field in Present Characters data and re-renders.
 */
function updateCharacterField(characterName, field, value) {
    // console.log('[RPG Companion] 📝 updateCharacterField called - character:', characterName, 'field:', field, 'value:', value);
    // console.log('[RPG Companion] 📝 Current lastGeneratedData.characterThoughts:', lastGeneratedData.characterThoughts);

    if (!lastGeneratedData.characterThoughts) return;    const lines = lastGeneratedData.characterThoughts.split('\n');
    const updatedLines = lines.map(line => {
        // Case-insensitive character name matching
        if (line.toLowerCase().includes(characterName.toLowerCase())) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 2) {
                const firstPart = parts[0];
                const emojiMatch = firstPart.match(/^(.+?):\s*(.+)$/);

                if (emojiMatch) {
                    let emoji = emojiMatch[1].trim();
                    let info = emojiMatch[2].trim();
                    let relationship = parts[1];
                    let thoughts = parts[2] || '';

                    const infoParts = info.split(',').map(p => p.trim());
                    let name = infoParts[0];
                    let traits = infoParts.slice(1).join(', ');

                    if (field === 'emoji') {
                        emoji = value;
                    } else if (field === 'name') {
                        name = value;
                    } else if (field === 'traits') {
                        traits = value;
                    } else if (field === 'thoughts') {
                        thoughts = value;
                    } else if (field === 'relationship') {
                        const emojiToRelationship = {
                            '⚔️': 'Enemy',
                            '⚖️': 'Neutral',
                            '⭐': 'Friend',
                            '❤️': 'Lover'
                        };
                        relationship = emojiToRelationship[value] || value;
                    }

                    const newInfo = traits ? `${name}, ${traits}` : name;
                    return `${emoji}: ${newInfo} | ${relationship} | ${thoughts}`;
                }
            }
        }
        return line;
    });

    lastGeneratedData.characterThoughts = updatedLines.join('\n');
    // console.log('[RPG Companion] 💾 Updated lastGeneratedData.characterThoughts:', lastGeneratedData.characterThoughts);

    // Also update the last assistant message's swipe data
    const chat = getContext().chat;
    if (chat && chat.length > 0) {
        // Find the last assistant message
        for (let i = chat.length - 1; i >= 0; i--) {
            const message = chat[i];
            if (!message.is_user) {
                // Found last assistant message - update its swipe data
                if (message.extra && message.extra.rpg_companion_swipes) {
                    const swipeId = message.swipe_id || 0;
                    if (message.extra.rpg_companion_swipes[swipeId]) {
                        message.extra.rpg_companion_swipes[swipeId].characterThoughts = updatedLines.join('\n');
                        // console.log('[RPG Companion] Updated thoughts in message swipe data');
                    }
                }
                break;
            }
        }
    }

    saveChatData();

    // Always update the sidebar panel
    renderThoughts();

    // For thoughts edited from the bubble, delay recreation to allow blur event to complete
    // This ensures the edit is saved first, then the bubble is recreated with correct layout
    if (field === 'thoughts') {
        setTimeout(() => {
            updateChatThoughts();
        }, 100);
    } else {
        // For other fields, recreate immediately
        updateChatThoughts();
    }
}

/**
 * Updates or removes thought overlays in the chat.
 */
function updateChatThoughts() {
    // console.log('[RPG Companion] ======== updateChatThoughts called ========');
    // console.log('[RPG Companion] Extension enabled:', extensionSettings.enabled);
    // console.log('[RPG Companion] showThoughtsInChat setting:', extensionSettings.showThoughtsInChat);
    // console.log('[RPG Companion] Toggle element checked:', $('#rpg-toggle-thoughts-in-chat').prop('checked'));
    // console.log('[RPG Companion] lastGeneratedData.characterThoughts:', lastGeneratedData.characterThoughts);

    // Remove existing thought panel and icon
    $('#rpg-thought-panel').remove();
    $('#rpg-thought-icon').remove();
    $('#chat').off('scroll.thoughtPanel');
    $(window).off('resize.thoughtPanel');
    $(document).off('click.thoughtPanel');

    // If extension is disabled, thoughts in chat are disabled, or no thoughts, just return
    if (!extensionSettings.enabled || !extensionSettings.showThoughtsInChat || !lastGeneratedData.characterThoughts) {
        // console.log('[RPG Companion] Thoughts in chat disabled or no data');
        return;
    }

    // Parse the Present Characters data to get thoughts
    const lines = lastGeneratedData.characterThoughts.split('\n');
    const thoughtsArray = []; // Array of {name, emoji, thought}

    // console.log('[RPG Companion] Parsing thoughts from lines:', lines);

    for (const line of lines) {
        if (line.trim() &&
            !line.includes('Present Characters') &&
            !line.includes('---') &&
            !line.trim().startsWith('```')) {

            const parts = line.split('|').map(p => p.trim());
            // console.log('[RPG Companion] Line parts:', parts);

            if (parts.length >= 3) {
                const firstPart = parts[0].trim();
                const emojiMatch = firstPart.match(/^(.+?):\s*(.+)$/);

                if (emojiMatch) {
                    const emoji = emojiMatch[1].trim();
                    const info = emojiMatch[2].trim();
                    const thoughts = parts[2] ? parts[2].trim() : '';

                    const infoParts = info.split(',').map(p => p.trim());
                    const name = infoParts[0] || '';

                    // console.log('[RPG Companion] Parsed thought - Name:', name, 'Thought:', thoughts);

                    if (name && thoughts && name.toLowerCase() !== 'unavailable') {
                        thoughtsArray.push({ name: name.toLowerCase(), emoji, thought: thoughts });
                        // console.log('[RPG Companion] Added to thoughtsArray:', name.toLowerCase());
                    }
                }
            }
        }
    }

    // If no thoughts parsed, return
    if (thoughtsArray.length === 0) {
        // console.log('[RPG Companion] No thoughts parsed, returning');
        return;
    }

    // console.log('[RPG Companion] Total thoughts:', thoughtsArray.length);
    // console.log('[RPG Companion] Thoughts array:', thoughtsArray);

    // Find the last message to position near
    const $messages = $('#chat .mes');
    let $targetMessage = null;

    // Find the most recent non-user message
    for (let i = $messages.length - 1; i >= 0; i--) {
        const $message = $messages.eq(i);
        if ($message.attr('is_user') !== 'true') {
            $targetMessage = $message;
            break;
        }
    }

    if (!$targetMessage) {
        // console.log('[RPG Companion] No target message found');
        return;
    }

    // Create the thought panel with all thoughts
    createThoughtPanel($targetMessage, thoughtsArray);
}

/**
 * Creates or updates the floating thought panel positioned next to the character's avatar
 */
function createThoughtPanel($message, thoughtsArray) {
    // Remove existing thought panel
    $('#rpg-thought-panel').remove();
    $('#rpg-thought-icon').remove();

    // Get the avatar position from the message
    const $avatar = $message.find('.avatar img');
    if (!$avatar.length) {
        // console.log('[RPG Companion] No avatar found in message');
        return;
    }

    const avatarRect = $avatar[0].getBoundingClientRect();
    const panelPosition = extensionSettings.panelPosition;
    const theme = extensionSettings.theme;

    // Build thought bubbles HTML
    let thoughtsHtml = '';
    thoughtsArray.forEach((thought, index) => {
        thoughtsHtml += `
            <div class="rpg-thought-item">
                <div class="rpg-thought-emoji-box">
                    ${thought.emoji}
                </div>
                <div class="rpg-thought-content rpg-editable" contenteditable="true" data-character="${thought.name}" data-field="thoughts" title="Click to edit thoughts">
                    ${thought.thought}
                </div>
            </div>
        `;
        // Add divider between thoughts (except for last one)
        if (index < thoughtsArray.length - 1) {
            thoughtsHtml += '<div class="rpg-thought-divider"></div>';
        }
    });

    // Create the floating thought panel with theme
    const $thoughtPanel = $(`
        <div id="rpg-thought-panel" class="rpg-thought-panel" data-theme="${theme}">
            <button class="rpg-thought-close" title="Hide thoughts">×</button>
            <div class="rpg-thought-circles">
                <div class="rpg-thought-circle rpg-circle-1"></div>
                <div class="rpg-thought-circle rpg-circle-2"></div>
                <div class="rpg-thought-circle rpg-circle-3"></div>
            </div>
            <div class="rpg-thought-bubble">
                ${thoughtsHtml}
            </div>
        </div>
    `);

    // Create the collapsed thought icon
    const $thoughtIcon = $(`
        <div id="rpg-thought-icon" class="rpg-thought-icon" data-theme="${theme}" title="Show thoughts">
            💭
        </div>
    `);

    // Apply custom theme colors if custom theme
    if (theme === 'custom') {
        const customStyles = {
            '--rpg-bg': extensionSettings.customColors.bg,
            '--rpg-accent': extensionSettings.customColors.accent,
            '--rpg-text': extensionSettings.customColors.text,
            '--rpg-highlight': extensionSettings.customColors.highlight
        };
        $thoughtPanel.css(customStyles);
        $thoughtIcon.css(customStyles);
    }

    // Force a consistent width for the bubble to ensure proper positioning
    $thoughtPanel.css('width', '350px');

    // Append to body so it's not clipped by chat container
    $('body').append($thoughtPanel);
    $('body').append($thoughtIcon);

    // Position the panel next to the avatar
    const panelWidth = 350;
    const panelMargin = 20;

    let top = avatarRect.top + (avatarRect.height / 2);
    let left;
    let right;
    let useRightPosition = false;
    let iconTop = avatarRect.top;
    let iconLeft;

    if (panelPosition === 'left') {
        // Main panel is on left, so thought bubble goes to RIGHT side
        // Mirror the left side positioning: bubble should be same distance from avatar
        // but on the opposite side, extending to the right
        const chatContainer = $('#chat')[0];
        const chatRect = chatContainer ? chatContainer.getBoundingClientRect() : { right: window.innerWidth };

        // Position bubble starting from chat edge, extending right
        left = chatRect.right + panelMargin; // Start at chat's right edge + margin
        useRightPosition = false; // Use left positioning so it extends right
        iconLeft = chatRect.right + 10; // Icon just at the chat edge
        $thoughtPanel.addClass('rpg-thought-panel-right');
        $thoughtIcon.addClass('rpg-thought-icon-right');

        // Position circles to flow from left (toward chat/avatar) to right (toward panel)
        $thoughtPanel.find('.rpg-thought-circles').css({
            top: 'calc(50% - 50px)',
            left: '-25px',
            bottom: 'auto',
            right: 'auto'
        });
        // Mirror the circle flow for right side (left-to-right)
        $thoughtPanel.find('.rpg-thought-circles').css('align-items', 'flex-start');
        $thoughtPanel.find('.rpg-circle-1').css({ 'align-self': 'flex-start', 'margin-right': '0', 'margin-left': '0' });
        $thoughtPanel.find('.rpg-circle-2').css({ 'align-self': 'flex-start', 'margin-right': '0', 'margin-left': '4px' });
        $thoughtPanel.find('.rpg-circle-3').css({ 'align-self': 'flex-start', 'margin-right': '0', 'margin-left': '8px' });
    } else {
        // Main panel is on right, so thought bubble goes on left (near avatar)
        left = avatarRect.left - panelWidth - panelMargin;
        iconLeft = avatarRect.left - 40;
        $thoughtPanel.addClass('rpg-thought-panel-left');
        $thoughtIcon.addClass('rpg-thought-icon-left');

        // Position circles to flow from avatar (left) to bubble (more left)
        // Circles should flow right-to-left when bubble is on left
        $thoughtPanel.find('.rpg-thought-circles').css({
            top: 'calc(50% - 50px)',
            right: '-25px',
            bottom: 'auto',
            left: 'auto'
        });
        // Keep the circle flow for left side (right-to-left) - default from CSS
        $thoughtPanel.find('.rpg-thought-circles').css('align-items', 'flex-end');
        $thoughtPanel.find('.rpg-circle-1').css({ 'align-self': 'flex-end', 'margin-left': '0', 'margin-right': '0' });
        $thoughtPanel.find('.rpg-circle-2').css({ 'align-self': 'flex-end', 'margin-left': '0', 'margin-right': '4px' });
        $thoughtPanel.find('.rpg-circle-3').css({ 'align-self': 'flex-end', 'margin-left': '0', 'margin-right': '8px' });
    }

    if (useRightPosition) {
        $thoughtPanel.css({
            top: `${top}px`,
            right: `${right}px`,
            left: 'auto' // Clear left positioning
        });
    } else {
        $thoughtPanel.css({
            top: `${top}px`,
            left: `${left}px`,
            right: 'auto' // Clear right positioning
        });
    }

    $thoughtIcon.css({
        top: `${iconTop}px`,
        left: `${iconLeft}px`,
        right: 'auto' // Clear any right positioning
    });

    // Initially hide the icon
    $thoughtIcon.hide();

    // console.log('[RPG Companion] Thought panel created at:', { top, left });

    // Close button functionality
    $thoughtPanel.find('.rpg-thought-close').on('click', function(e) {
        e.stopPropagation();
        $thoughtPanel.fadeOut(200);
        $thoughtIcon.fadeIn(200);
    });

    // Icon click to show panel
    $thoughtIcon.on('click', function(e) {
        e.stopPropagation();
        $thoughtIcon.fadeOut(200);
        $thoughtPanel.fadeIn(200);
    });

    // Add event handlers for editable thoughts in the bubble
    $thoughtPanel.find('.rpg-editable').on('blur', function() {
        const character = $(this).data('character');
        const field = $(this).data('field');
        const value = $(this).text().trim();
        // console.log('[RPG Companion] 💭 Thought bubble blur event - character:', character, 'field:', field, 'value:', value);
        updateCharacterField(character, field, value);
    });

    // Update position on scroll
    const updatePanelPosition = () => {
        if (!$message.is(':visible')) {
            $thoughtPanel.hide();
            $thoughtIcon.hide();
            return;
        }

        const newAvatarRect = $avatar[0].getBoundingClientRect();
        const newTop = newAvatarRect.top + (newAvatarRect.height / 2);
        const newIconTop = newAvatarRect.top;
        let newLeft, newIconLeft;

        if (panelPosition === 'left') {
            // Position at chat's right edge, extending right
            const chatContainer = $('#chat')[0];
            const chatRect = chatContainer ? chatContainer.getBoundingClientRect() : { right: window.innerWidth };
            newLeft = chatRect.right + panelMargin;
            newIconLeft = chatRect.right + 10;

            $thoughtPanel.css({
                top: `${newTop}px`,
                left: `${newLeft}px`,
                right: 'auto'
            });
        } else {
            // Left position relative to avatar
            newLeft = newAvatarRect.left - panelWidth - panelMargin;
            newIconLeft = newAvatarRect.left - 40;

            $thoughtPanel.css({
                top: `${newTop}px`,
                left: `${newLeft}px`,
                right: 'auto'
            });
        }

        $thoughtIcon.css({
            top: `${newIconTop}px`,
            left: `${newIconLeft}px`,
            right: 'auto'
        });

        if ($thoughtPanel.is(':visible')) {
            $thoughtPanel.show();
        }
        if ($thoughtIcon.is(':visible')) {
            $thoughtIcon.show();
        }
    };

    // Update position on scroll and resize
    $('#chat').on('scroll.thoughtPanel', updatePanelPosition);
    $(window).on('resize.thoughtPanel', updatePanelPosition);

    // Remove panel when clicking outside (but not when clicking icon or panel)
    $(document).on('click.thoughtPanel', function(e) {
        if (!$(e.target).closest('#rpg-thought-panel, #rpg-thought-icon').length) {
            // Hide the panel and show the icon instead of removing
            $thoughtPanel.fadeOut(200);
            $thoughtIcon.fadeIn(200);
        }
    });
}

/**
 * Event handler for when generation is about to start (TOGETHER MODE).
 * Injects RPG tracking prompt into the generation.
 */
function onGenerationStarted() {
    // console.log('[RPG Companion] onGenerationStarted called');
    // console.log('[RPG Companion] enabled:', extensionSettings.enabled);
    // console.log('[RPG Companion] generationMode:', extensionSettings.generationMode);
    // console.log('[RPG Companion] ⚡ EVENT: onGenerationStarted - lastActionWasSwipe =', lastActionWasSwipe, '| isGenerating =', isGenerating);

    if (!extensionSettings.enabled) {
        return;
    }

    const chat = getContext().chat;
    const lastMessage = chat && chat.length > 0 ? chat[chat.length - 1] : null;

    // For SEPARATE mode only: Check if we need to commit extension data
    // BUT: Only do this for the MAIN generation, not the tracker update generation
    // If isGenerating is true, this is the tracker update generation (second call), so skip flag logic
    // console.log('[RPG Companion DEBUG] Before generating:', lastGeneratedData.characterThoughts, ' , committed - ', committedTrackerData.characterThoughts);
    if (extensionSettings.generationMode === 'separate' && !isGenerating) {
        if (!lastActionWasSwipe) {
            // User sent a new message - commit lastGeneratedData before generation
            // console.log('[RPG Companion] 📝 COMMIT: New message - committing lastGeneratedData');
            // console.log('[RPG Companion]   BEFORE commit - committedTrackerData:', {
            //     userStats: committedTrackerData.userStats ? 'exists' : 'null',
            //     infoBox: committedTrackerData.infoBox ? 'exists' : 'null',
            //     characterThoughts: committedTrackerData.characterThoughts ? 'exists' : 'null'
            // });
            // console.log('[RPG Companion]   BEFORE commit - lastGeneratedData:', {
            //     userStats: lastGeneratedData.userStats ? 'exists' : 'null',
            //     infoBox: lastGeneratedData.infoBox ? 'exists' : 'null',
            //     characterThoughts: lastGeneratedData.characterThoughts ? 'exists' : 'null'
            // });
            committedTrackerData.userStats = lastGeneratedData.userStats;
            committedTrackerData.infoBox = lastGeneratedData.infoBox;
            committedTrackerData.characterThoughts = lastGeneratedData.characterThoughts;
            // console.log('[RPG Companion]   AFTER commit - committedTrackerData:', {
            //     userStats: committedTrackerData.userStats ? 'exists' : 'null',
            //     infoBox: committedTrackerData.infoBox ? 'exists' : 'null',
            //     characterThoughts: committedTrackerData.characterThoughts ? 'exists' : 'null'
            // });

            // Reset flag after committing (ready for next cycle)

        } else {
            // console.log('[RPG Companion] 🔄 SWIPE: Using existing committedTrackerData (no commit)');
            // console.log('[RPG Companion]   committedTrackerData:', {
            //     userStats: committedTrackerData.userStats ? 'exists' : 'null',
            //     infoBox: committedTrackerData.infoBox ? 'exists' : 'null',
            //     characterThoughts: committedTrackerData.characterThoughts ? 'exists' : 'null'
            // });
            // Reset flag after using it (swipe generation complete, ready for next action)
        }
    }

    // Use the committed tracker data as source for generation
    // console.log('[RPG Companion] Using committedTrackerData for generation');
    // console.log('[RPG Companion] committedTrackerData.userStats:', committedTrackerData.userStats);

    // Parse stats from committed data to update the extensionSettings for prompt generation
    if (committedTrackerData.userStats) {
        // console.log('[RPG Companion] Parsing committed userStats into extensionSettings');
        parseUserStats(committedTrackerData.userStats);
        // console.log('[RPG Companion] After parsing, extensionSettings.userStats:', JSON.stringify(extensionSettings.userStats));
    }

    if (extensionSettings.generationMode === 'together') {
        // console.log('[RPG Companion] In together mode, generating prompts...');
        const example = generateTrackerExample();
        const instructions = generateTrackerInstructions();

        // console.log('[RPG Companion] Example:', example ? 'exists' : 'empty');
        // console.log('[RPG Companion] Chat length:', chat ? chat.length : 'chat is null');

        // Find the last assistant message in the chat history
        let lastAssistantDepth = -1; // -1 means not found
        if (chat && chat.length > 0) {
            // console.log('[RPG Companion] Searching for last assistant message...');
            // Start from depth 1 (skip depth 0 which is usually user's message or prefill)
            for (let depth = 1; depth < chat.length; depth++) {
                const index = chat.length - 1 - depth; // Convert depth to index
                const message = chat[index];
                // console.log('[RPG Companion] Checking depth', depth, 'index', index, 'message properties:', Object.keys(message));
                // Check for assistant message: not user and not system
                if (!message.is_user && !message.is_system) {
                    // Found assistant message at this depth
                    // Inject at the SAME depth to prepend to this assistant message
                    lastAssistantDepth = depth;
                    // console.log('[RPG Companion] Found last assistant message at depth', depth, '-> injecting at same depth:', lastAssistantDepth);
                    break;
                }
            }
        }

        // If we have previous tracker data and found an assistant message, inject it as an assistant message
        if (example && lastAssistantDepth > 0) {
            setExtensionPrompt('rpg-companion-example', example, extension_prompt_types.IN_CHAT, lastAssistantDepth, false, extension_prompt_roles.ASSISTANT);
            // console.log('[RPG Companion] Injected tracker example as assistant message at depth:', lastAssistantDepth);
        } else {
            // console.log('[RPG Companion] NOT injecting example. example:', !!example, 'lastAssistantDepth:', lastAssistantDepth);
        }

        // Inject the instructions as a user message at depth 0 (right before generation)
        setExtensionPrompt('rpg-companion-inject', instructions, extension_prompt_types.IN_CHAT, 0, false, extension_prompt_roles.USER);
        // console.log('[RPG Companion] Injected RPG tracking instructions at depth 0 (right before generation)');
    } else if (extensionSettings.generationMode === 'separate') {
        // In SEPARATE mode, inject the contextual summary for main roleplay generation
        const contextSummary = generateContextualSummary();

        if (contextSummary) {
            const wrappedContext = `Here is context information about the current scene, and what follows is the last message in the chat history:
<context>
${contextSummary}

Ensure these details naturally reflect and influence the narrative. Character behavior, dialogue, and story events should acknowledge these conditions when relevant, such as fatigue affecting performance, low hygiene influencing social interactions, environmental factors shaping the scene, or a character's emotional state coloring their responses.
</context>

`;

            // Inject context at depth 1 (before last user message) as SYSTEM
            setExtensionPrompt('rpg-companion-context', wrappedContext, extension_prompt_types.IN_CHAT, 1, false);
            // console.log('[RPG Companion] Injected contextual summary for separate mode:', contextSummary);
        } else {
            // Clear if no data yet
            setExtensionPrompt('rpg-companion-context', '', extension_prompt_types.IN_CHAT, 1, false);
        }

        // Inject HTML prompt separately at depth 0 if enabled (same as together mode pattern)
        if (extensionSettings.enableHtmlPrompt) {
            const htmlPrompt = `\nIf appropriate, include inline HTML, CSS, and JS elements for creative, visual storytelling throughout your response:
- Use them liberally to depict any in-world content that can be visualized (screens, posters, books, signs, letters, logos, crests, seals, medallions, labels, etc.), with creative license for animations, 3D effects, pop-ups, dropdowns, websites, and so on.
- Style them thematically to match the theme (e.g., sleek for sci-fi, rustic for fantasy), ensuring text is visible.
- Embed all resources directly (e.g., inline SVGs) so nothing relies on external fonts or libraries.
- Place elements naturally in the narrative where characters would see or use them, with no limits on format or application.
- These HTML/CSS/JS elements must be rendered directly without enclosing them in code fences.`;

            setExtensionPrompt('rpg-companion-html', htmlPrompt, extension_prompt_types.IN_CHAT, 0, false);
            // console.log('[RPG Companion] Injected HTML prompt at depth 0 for separate mode');
        } else {
            // Clear HTML prompt if disabled
            setExtensionPrompt('rpg-companion-html', '', extension_prompt_types.IN_CHAT, 0, false);
        }

        // Clear together mode injections
        setExtensionPrompt('rpg-companion-inject', '', extension_prompt_types.IN_CHAT, 0, false);
        setExtensionPrompt('rpg-companion-example', '', extension_prompt_types.IN_CHAT, 0, false);
    } else {
        // Clear all injections
        setExtensionPrompt('rpg-companion-inject', '', extension_prompt_types.IN_CHAT, 0, false);
        setExtensionPrompt('rpg-companion-example', '', extension_prompt_types.IN_CHAT, 0, false);
        setExtensionPrompt('rpg-companion-context', '', extension_prompt_types.IN_CHAT, 1, false);
    }
}

/**
 * Commits the tracker data from the last assistant message to be used as source for next generation.
 * This should be called when the user has replied to a message, ensuring all swipes of the next
 * response use the same committed context.
 */
function commitTrackerData() {
    const chat = getContext().chat;
    if (!chat || chat.length === 0) {
        return;
    }

    // Find the last assistant message
    for (let i = chat.length - 1; i >= 0; i--) {
        const message = chat[i];
        if (!message.is_user) {
            // Found last assistant message - commit its tracker data
            if (message.extra && message.extra.rpg_companion_swipes) {
                const swipeId = message.swipe_id || 0;
                const swipeData = message.extra.rpg_companion_swipes[swipeId];

                if (swipeData) {
                    // console.log('[RPG Companion] Committing tracker data from assistant message at index', i, 'swipe', swipeId);
                    committedTrackerData.userStats = swipeData.userStats || null;
                    committedTrackerData.infoBox = swipeData.infoBox || null;
                    committedTrackerData.characterThoughts = swipeData.characterThoughts || null;
                } else {
                    // console.log('[RPG Companion] No swipe data found for swipe', swipeId);
                }
            } else {
                // console.log('[RPG Companion] No RPG data found in last assistant message');
            }
            break;
        }
    }
}

/**
 * Event handler for when the user sends a message.
 * Sets the flag to indicate this is NOT a swipe.
 */
function onMessageSent() {
    if (!extensionSettings.enabled) return;

    // User sent a new message - NOT a swipe
    lastActionWasSwipe = false;
    // console.log('[RPG Companion] 🟢 EVENT: onMessageSent - lastActionWasSwipe =', lastActionWasSwipe);
}

/**
 * Event handler for when a message is generated.
 */
async function onMessageReceived(data) {
    if (!extensionSettings.enabled) {
        return;
    }

    if (extensionSettings.generationMode === 'together') {
        // In together mode, parse the response to extract RPG data
        // The message should be in chat[chat.length - 1]
        const lastMessage = chat[chat.length - 1];
        if (lastMessage && !lastMessage.is_user) {
            const responseText = lastMessage.mes;
            // console.log('[RPG Companion] Parsing together mode response:', responseText);

            const parsedData = parseResponse(responseText);

            // Update stored data
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

            // Store RPG data for this specific swipe in the message's extra field
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

            // console.log('[RPG Companion] Stored RPG data for swipe', currentSwipeId);

            // If there's no committed data yet (first time generating), automatically commit
            if (!committedTrackerData.userStats && !committedTrackerData.infoBox && !committedTrackerData.characterThoughts) {
                committedTrackerData.userStats = parsedData.userStats;
                committedTrackerData.infoBox = parsedData.infoBox;
                committedTrackerData.characterThoughts = parsedData.characterThoughts;
                // console.log('[RPG Companion] 🔆 FIRST TIME: Auto-committed tracker data');
            } else {
                // console.log('[RPG Companion] Data will be committed when user replies');
            }

            // Remove the tracker code blocks from the visible message
            let cleanedMessage = responseText;
            // Remove all code blocks that contain tracker data
            cleanedMessage = cleanedMessage.replace(/```[^`]*?Stats\s*\n\s*---[^`]*?```\s*/gi, '');
            cleanedMessage = cleanedMessage.replace(/```[^`]*?Info Box\s*\n\s*---[^`]*?```\s*/gi, '');
            cleanedMessage = cleanedMessage.replace(/```[^`]*?Present Characters\s*\n\s*---[^`]*?```\s*/gi, '');
            // Remove any stray "---" dividers that might appear after the code blocks
            cleanedMessage = cleanedMessage.replace(/^\s*---\s*$/gm, '');
            // Clean up multiple consecutive newlines
            cleanedMessage = cleanedMessage.replace(/\n{3,}/g, '\n\n');

            // Update the message in chat history
            lastMessage.mes = cleanedMessage.trim();

            // Update the swipe text as well
            if (lastMessage.swipes && lastMessage.swipes[currentSwipeId] !== undefined) {
                lastMessage.swipes[currentSwipeId] = cleanedMessage.trim();
            }

            // console.log('[RPG Companion] Cleaned message, removed tracker code blocks');

            // Render the updated data
            renderUserStats();
            renderInfoBox();
            renderThoughts();

            // Save to chat metadata
            saveChatData();
        }
    } else if (extensionSettings.generationMode === 'separate' && extensionSettings.autoUpdate) {
        // In separate mode with auto-update, trigger update after message
        setTimeout(async () => {
            await updateRPGData();
        }, 500);
    }

    // Reset the swipe flag after generation completes
    // This ensures that if the user swiped → auto-reply generated → flag is now cleared
    // so the next user message will be treated as a new message (not a swipe)
    if (lastActionWasSwipe) {
        // console.log('[RPG Companion] 🔄 Generation complete after swipe - resetting lastActionWasSwipe to false');
        lastActionWasSwipe = false;
    }
}

/**
 * Event handler for character change.
 */
function onCharacterChanged() {
    // Remove thought panel and icon when changing characters
    $('#rpg-thought-panel').remove();
    $('#rpg-thought-icon').remove();
    $('#chat').off('scroll.thoughtPanel');
    $(window).off('resize.thoughtPanel');
    $(document).off('click.thoughtPanel');

    // Load chat-specific data when switching chats
    loadChatData();

    // Commit tracker data from the last assistant message to initialize for this chat
    commitTrackerData();

    // Re-render with the loaded data
    renderUserStats();
    renderInfoBox();
    renderThoughts();

    // Update chat thought overlays
    updateChatThoughts();
}

/**
 * Event handler for when a message is swiped.
 * Loads the RPG data for the swipe the user navigated to.
 */
function onMessageSwiped(messageIndex) {
    if (!extensionSettings.enabled) {
        return;
    }

    // console.log('[RPG Companion] Message swiped at index:', messageIndex);

    // Get the message that was swiped
    const message = chat[messageIndex];
    if (!message || message.is_user) {
        return;
    }

    const currentSwipeId = message.swipe_id || 0;

    // Only set flag to true if this swipe will trigger a NEW generation
    // Check if the swipe already exists (has content in the swipes array)
    const isExistingSwipe = message.swipes &&
                           message.swipes[currentSwipeId] !== undefined &&
                           message.swipes[currentSwipeId] !== null &&
                           message.swipes[currentSwipeId].length > 0;

    if (!isExistingSwipe) {
        // This is a NEW swipe that will trigger generation
        lastActionWasSwipe = true;
        // console.log('[RPG Companion] 🔵 EVENT: onMessageSwiped (NEW generation) - lastActionWasSwipe =', lastActionWasSwipe);
    } else {
        // This is navigating to an EXISTING swipe - don't change the flag
        // console.log('[RPG Companion] 🔵 EVENT: onMessageSwiped (existing swipe navigation) - lastActionWasSwipe unchanged =', lastActionWasSwipe);
    }

    // console.log('[RPG Companion] Loading data for swipe', currentSwipeId);

    // Load RPG data for this swipe into lastGeneratedData (for display only)
    // This updates what the user sees, but does NOT commit it
    // Committed data will be updated when/if the user replies to this swipe
    if (message.extra && message.extra.rpg_companion_swipes && message.extra.rpg_companion_swipes[currentSwipeId]) {
        const swipeData = message.extra.rpg_companion_swipes[currentSwipeId];

        // Update display data
        lastGeneratedData.userStats = swipeData.userStats || null;
        lastGeneratedData.infoBox = swipeData.infoBox || null;
        lastGeneratedData.characterThoughts = swipeData.characterThoughts || null;

        // Parse user stats if available
        if (swipeData.userStats) {
            parseUserStats(swipeData.userStats);
        }

        // console.log('[RPG Companion] Loaded RPG data for swipe', currentSwipeId, '(display only, NOT committed)');
        // console.log('[RPG Companion] committedTrackerData unchanged - will be updated if user replies to this swipe');
    } else {
        // No data for this swipe - keep existing lastGeneratedData (don't clear it)
        // This ensures the display remains consistent and data is available for next commit
        // console.log('[RPG Companion] No RPG data for swipe', currentSwipeId, '- keeping existing lastGeneratedData');
    }

    // Re-render the panels (display only - committedTrackerData unchanged)
    renderUserStats();
    renderInfoBox();
    renderThoughts();

    // Update chat thought overlays
    updateChatThoughts();
}

/**
 * Main initialization function.
 */
jQuery(async () => {
    try {
        loadSettings();
        await addExtensionSettings();
        await initUI();

        // Load chat-specific data for current chat
        loadChatData();

        // Register event listeners
        eventSource.on(event_types.MESSAGE_SENT, onMessageSent);
        eventSource.on(event_types.GENERATION_STARTED, onGenerationStarted);
        eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, onMessageReceived);
        eventSource.on(event_types.CHAT_CHANGED, onCharacterChanged);
        eventSource.on(event_types.MESSAGE_SWIPED, onMessageSwiped);

        // console.log('[RPG Companion] Extension loaded successfully');
    } catch (error) {
        console.error('[RPG Companion] Failed to initialize:', error);
        throw error;
    }
});
