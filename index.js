import { getContext, renderExtensionTemplateAsync, extension_settings as st_extension_settings } from '../../../extensions.js';
import { eventSource, event_types, substituteParams, chat, generateRaw, saveSettingsDebounced, chat_metadata, saveChatDebounced, user_avatar, getThumbnailUrl, characters, this_chid, extension_prompt_types, extension_prompt_roles, setExtensionPrompt, reloadCurrentChat, Generate } from '../../../../script.js';
import { selected_group, getGroupMembers } from '../../../group-chats.js';
import { power_user } from '../../../power-user.js';

// Core modules
import { extensionName, extensionFolderPath } from './src/core/config.js';
import {
    extensionSettings,
    lastGeneratedData,
    committedTrackerData,
    lastActionWasSwipe,
    isGenerating,
    isPlotProgression,
    pendingDiceRoll,
    FALLBACK_AVATAR_DATA_URI,
    $panelContainer,
    $userStatsContainer,
    $infoBoxContainer,
    $thoughtsContainer,
    setExtensionSettings,
    updateExtensionSettings,
    setLastGeneratedData,
    updateLastGeneratedData,
    setCommittedTrackerData,
    updateCommittedTrackerData,
    setLastActionWasSwipe,
    setIsGenerating,
    setIsPlotProgression,
    setPendingDiceRoll,
    setPanelContainer,
    setUserStatsContainer,
    setInfoBoxContainer,
    setThoughtsContainer
} from './src/core/state.js';
import { loadSettings, saveSettings, saveChatData, loadChatData, updateMessageSwipeData } from './src/core/persistence.js';
import { on as eventOn, event_types as coreEventTypes } from './src/core/events.js';

// Generation & Parsing modules
import {
    generateTrackerExample,
    generateTrackerInstructions,
    generateContextualSummary,
    generateRPGPromptText,
    generateSeparateUpdatePrompt
} from './src/systems/generation/promptBuilder.js';
import { parseResponse, parseUserStats } from './src/systems/generation/parser.js';
import { updateRPGData } from './src/systems/generation/apiClient.js';
import { onGenerationStarted } from './src/systems/generation/injector.js';

// Rendering modules
import { getSafeThumbnailUrl } from './src/utils/avatars.js';
import { renderUserStats } from './src/systems/rendering/userStats.js';
import { renderInfoBox, updateInfoBoxField } from './src/systems/rendering/infoBox.js';
import {
    renderThoughts,
    updateCharacterField,
    updateChatThoughts,
    createThoughtPanel
} from './src/systems/rendering/thoughts.js';

// Old state variable declarations removed - now imported from core modules
// (extensionSettings, lastGeneratedData, committedTrackerData, etc. are now in src/core/state.js)

// Utility functions removed - now imported from src/utils/avatars.js
// (getSafeThumbnailUrl)

// Persistence functions removed - now imported from src/core/persistence.js
// (loadSettings, saveSettings, saveChatData, loadChatData, updateMessageSwipeData)

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

    // Append panel to body - positioning handled by CSS
    $('body').append(templateHtml);

    // Add mobile toggle button (FAB - Floating Action Button)
    const mobileToggleHtml = `
        <button id="rpg-mobile-toggle" class="rpg-mobile-toggle" title="Toggle RPG Panel">
            <i class="fa-solid fa-dice-d20"></i>
        </button>
    `;
    $('body').append(mobileToggleHtml);

    // Cache UI elements using state setters
    setPanelContainer($('#rpg-companion-panel'));
    setUserStatsContainer($('#rpg-user-stats'));
    setInfoBoxContainer($('#rpg-info-box'));
    setThoughtsContainer($('#rpg-thoughts'));

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
        await updateRPGData(renderUserStats, renderInfoBox, renderThoughts);
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

    // Setup mobile toggle button
    setupMobileToggle();

    // Setup collapse/expand toggle button
    setupCollapseToggle();

    // Render initial data if available
    renderUserStats();
    renderInfoBox();
    renderThoughts();
    updateDiceDisplay();
    setupDiceRoller();
    setupClassicStatsButtons();
    setupSettingsPopup();
    addDiceQuickReply();
    setupPlotButtons();
    setupMobileKeyboardHandling();
    setupContentEditableScrolling();
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
    // This prevents RPG tracker instructions from being injected during plot progression
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

        // Set flag to indicate we're doing plot progression
        // This will be used by onMessageReceived to clear the prompt after generation completes
        isPlotProgression = true;

        // console.log('[RPG Companion] Calling Generate with continuation and plot prompt');
        // console.log('[RPG Companion] Full prompt:', prompt);

        // Pass the prompt via options with the correct property name
        // Based on /continue slash command implementation, it uses quiet_prompt (underscore, not camelCase)
        const options = {
            quiet_prompt: prompt,  // Use underscore notation, not camelCase
            quietToLoud: true
        };

        // Call Generate with 'continue' type and our custom prompt
        await Generate('continue', options);

        // console.log('[RPG Companion] Plot progression generation triggered');
    } catch (error) {
        console.error('[RPG Companion] Error sending plot progression:', error);
        isPlotProgression = false;
    } finally {
        // Restore original enabled state and re-enable buttons after a delay
        setTimeout(() => {
            extensionSettings.enabled = wasEnabled;
            $('#rpg-plot-random, #rpg-plot-natural').prop('disabled', false).css('opacity', '1');
        }, 1000);
    }
}

/**
 * Modern DiceModal ES6 Class
 * Manages dice roller modal with proper state management and CSS classes
 */
class DiceModal {
    constructor() {
        this.modal = document.getElementById('rpg-dice-popup');
        this.animation = document.getElementById('rpg-dice-animation');
        this.result = document.getElementById('rpg-dice-result');
        this.resultValue = document.getElementById('rpg-dice-result-value');
        this.resultDetails = document.getElementById('rpg-dice-result-details');
        this.rollBtn = document.getElementById('rpg-dice-roll-btn');

        this.state = 'IDLE'; // IDLE, ROLLING, SHOWING_RESULT
        this.isAnimating = false;
    }

    /**
     * Opens the modal with proper animation
     */
    open() {
        if (this.isAnimating) return;

        // Apply theme
        const theme = extensionSettings.theme;
        this.modal.setAttribute('data-theme', theme);

        // Apply custom theme if needed
        if (theme === 'custom') {
            this._applyCustomTheme();
        }

        // Reset to initial state
        this._setState('IDLE');

        // Open modal with CSS class
        this.modal.classList.add('is-open');
        this.modal.classList.remove('is-closing');

        // Focus management
        this.modal.querySelector('#rpg-dice-popup-close')?.focus();
    }

    /**
     * Closes the modal with animation
     */
    close() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.modal.classList.add('is-closing');
        this.modal.classList.remove('is-open');

        // Wait for animation to complete
        setTimeout(() => {
            this.modal.classList.remove('is-closing');
            this.isAnimating = false;

            // Clear pending roll
            setPendingDiceRoll(null);
        }, 200);
    }

    /**
     * Starts the rolling animation
     */
    startRolling() {
        this._setState('ROLLING');
    }

    /**
     * Shows the result
     * @param {number} total - The total roll value
     * @param {Array<number>} rolls - Individual roll values
     */
    showResult(total, rolls) {
        this._setState('SHOWING_RESULT');

        // Update result values
        this.resultValue.textContent = total;
        this.resultValue.classList.add('is-animating');

        // Remove animation class after it completes
        setTimeout(() => {
            this.resultValue.classList.remove('is-animating');
        }, 500);

        // Show details if multiple rolls
        if (rolls && rolls.length > 1) {
            this.resultDetails.textContent = `Rolls: ${rolls.join(', ')}`;
        } else {
            this.resultDetails.textContent = '';
        }
    }

    /**
     * Manages modal state changes
     * @private
     */
    _setState(newState) {
        this.state = newState;

        switch (newState) {
            case 'IDLE':
                this.rollBtn.hidden = false;
                this.animation.hidden = true;
                this.result.hidden = true;
                break;

            case 'ROLLING':
                this.rollBtn.hidden = true;
                this.animation.hidden = false;
                this.result.hidden = true;
                this.animation.setAttribute('aria-busy', 'true');
                break;

            case 'SHOWING_RESULT':
                this.rollBtn.hidden = true;
                this.animation.hidden = true;
                this.result.hidden = false;
                this.animation.setAttribute('aria-busy', 'false');
                break;
        }
    }

    /**
     * Applies custom theme colors
     * @private
     */
    _applyCustomTheme() {
        const content = this.modal.querySelector('.rpg-dice-popup-content');
        if (content && extensionSettings.customColors) {
            content.style.setProperty('--rpg-bg', extensionSettings.customColors.bg);
            content.style.setProperty('--rpg-accent', extensionSettings.customColors.accent);
            content.style.setProperty('--rpg-text', extensionSettings.customColors.text);
            content.style.setProperty('--rpg-highlight', extensionSettings.customColors.highlight);
        }
    }
}

// Global instance
let diceModal = null;

/**
 * Sets up the dice roller functionality.
 */
function setupDiceRoller() {
    // Initialize DiceModal instance
    diceModal = new DiceModal();
    // Click dice display to open popup
    $('#rpg-dice-display').on('click', function() {
        openDicePopup();
    });

    // Close popup - handle both close button and backdrop clicks
    $('#rpg-dice-popup-close').on('click', function() {
        closeDicePopup();
    });

    // Close on backdrop click (clicking outside content)
    $('#rpg-dice-popup').on('click', function(e) {
        if (e.target === this) {
            closeDicePopup();
        }
    });

    // Roll dice button
    $('#rpg-dice-roll-btn').on('click', async function() {
        await rollDice();
    });

    // Save roll button (closes popup and saves the roll)
    $('#rpg-dice-save-btn').on('click', function() {
        // Save the pending roll
        if (pendingDiceRoll) {
            extensionSettings.lastDiceRoll = pendingDiceRoll;
            saveSettings();
            updateDiceDisplay();
            setPendingDiceRoll(null);
        }
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
 * Backwards compatible wrapper for DiceModal class.
 */
function openDicePopup() {
    if (diceModal) {
        diceModal.open();
    }
}

/**
 * Closes the dice rolling popup.
 * Backwards compatible wrapper for DiceModal class.
 */
function closeDicePopup() {
    if (diceModal) {
        diceModal.close();
    }
}

/**
 * @deprecated Legacy function - use diceModal._applyCustomTheme() instead
 */
function applyCustomThemeToPopup() {
    if (diceModal) {
        diceModal._applyCustomTheme();
    }
}

/**
 * Rolls the dice and displays result.
 * Refactored to use DiceModal class.
 */
async function rollDice() {
    if (!diceModal) return;

    const count = parseInt(String($('#rpg-dice-count').val())) || 1;
    const sides = parseInt(String($('#rpg-dice-sides').val())) || 20;

    // Start rolling animation
    diceModal.startRolling();

    // Wait for animation (simulate rolling)
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Execute /roll command
    const rollCommand = `/roll ${count}d${sides}`;
    const rollResult = await executeRollCommand(rollCommand);

    // Parse result
    const total = rollResult.total || 0;
    const rolls = rollResult.rolls || [];

    // Store result temporarily (not saved until "Save Roll" is clicked)
    setPendingDiceRoll({
        formula: `${count}d${sides}`,
        total: total,
        rolls: rolls,
        timestamp: Date.now()
    });

    // Show result
    diceModal.showResult(total, rolls);

    // Don't update sidebar display yet - only update when user clicks "Save Roll"
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
 * Sets up event listeners for classic stat +/- buttons using delegation.
 * Uses delegated events to persist across re-renders of the stats section.
 */
function setupClassicStatsButtons() {
    if (!$userStatsContainer) return;

    // Delegated event listener for increase buttons
    $userStatsContainer.on('click', '.rpg-stat-increase', function() {
        const stat = $(this).data('stat');
        if (extensionSettings.classicStats[stat] < 100) {
            extensionSettings.classicStats[stat]++;
            saveSettings();
            saveChatData();
            // Update only the specific stat value, not the entire stats panel
            $(this).closest('.rpg-classic-stat').find('.rpg-classic-stat-value').text(extensionSettings.classicStats[stat]);
        }
    });

    // Delegated event listener for decrease buttons
    $userStatsContainer.on('click', '.rpg-stat-decrease', function() {
        const stat = $(this).data('stat');
        if (extensionSettings.classicStats[stat] > 1) {
            extensionSettings.classicStats[stat]--;
            saveSettings();
            saveChatData();
            // Update only the specific stat value, not the entire stats panel
            $(this).closest('.rpg-classic-stat').find('.rpg-classic-stat-value').text(extensionSettings.classicStats[stat]);
        }
    });
}

/**
 * SettingsModal - Manages the settings popup modal
 * Handles opening, closing, theming, and animations
 */
class SettingsModal {
    constructor() {
        this.modal = document.getElementById('rpg-settings-popup');
        this.content = this.modal?.querySelector('.rpg-settings-popup-content');
        this.isAnimating = false;
    }

    /**
     * Opens the modal with proper animation
     */
    open() {
        if (this.isAnimating || !this.modal) return;

        // Apply theme
        const theme = extensionSettings.theme || 'default';
        this.modal.setAttribute('data-theme', theme);

        // Apply custom theme if needed
        if (theme === 'custom') {
            this._applyCustomTheme();
        }

        // Open modal with CSS class
        this.modal.classList.add('is-open');
        this.modal.classList.remove('is-closing');

        // Focus management
        this.modal.querySelector('#rpg-close-settings')?.focus();
    }

    /**
     * Closes the modal with animation
     */
    close() {
        if (this.isAnimating || !this.modal) return;

        this.isAnimating = true;
        this.modal.classList.add('is-closing');
        this.modal.classList.remove('is-open');

        // Wait for animation to complete
        setTimeout(() => {
            this.modal.classList.remove('is-closing');
            this.isAnimating = false;
        }, 200);
    }

    /**
     * Updates the theme in real-time (used when theme selector changes)
     */
    updateTheme() {
        if (!this.modal) return;

        const theme = extensionSettings.theme || 'default';
        this.modal.setAttribute('data-theme', theme);

        if (theme === 'custom') {
            this._applyCustomTheme();
        } else {
            // Clear custom CSS variables to let theme CSS take over
            this._clearCustomTheme();
        }
    }

    /**
     * Applies custom theme colors
     * @private
     */
    _applyCustomTheme() {
        if (!this.content || !extensionSettings.customColors) return;

        this.content.style.setProperty('--rpg-bg', extensionSettings.customColors.bg);
        this.content.style.setProperty('--rpg-accent', extensionSettings.customColors.accent);
        this.content.style.setProperty('--rpg-text', extensionSettings.customColors.text);
        this.content.style.setProperty('--rpg-highlight', extensionSettings.customColors.highlight);
    }

    /**
     * Clears custom theme colors
     * @private
     */
    _clearCustomTheme() {
        if (!this.content) return;

        this.content.style.setProperty('--rpg-bg', '');
        this.content.style.setProperty('--rpg-accent', '');
        this.content.style.setProperty('--rpg-text', '');
        this.content.style.setProperty('--rpg-highlight', '');
    }
}

// Global instance
let settingsModal = null;

/**
 * Opens the settings popup.
 * Backwards compatible wrapper for SettingsModal class.
 */
function openSettingsPopup() {
    if (settingsModal) {
        settingsModal.open();
    }
}

/**
 * Closes the settings popup.
 * Backwards compatible wrapper for SettingsModal class.
 */
function closeSettingsPopup() {
    if (settingsModal) {
        settingsModal.close();
    }
}

/**
 * Applies custom theme colors to the settings popup.
 * Backwards compatible wrapper for SettingsModal class.
 * @deprecated Use settingsModal.updateTheme() instead
 */
function applyCustomThemeToSettingsPopup() {
    if (settingsModal) {
        settingsModal._applyCustomTheme();
    }
}

/**
 * Updates the settings popup theme in real-time.
 * Backwards compatible wrapper for SettingsModal class.
 */
function updateSettingsPopupTheme() {
    if (settingsModal) {
        settingsModal.updateTheme();
    }
}

/**
 * Sets up the settings popup functionality.
 */
function setupSettingsPopup() {
    // Initialize SettingsModal instance
    settingsModal = new SettingsModal();

    // Open settings popup
    $('#rpg-open-settings').on('click', function() {
        openSettingsPopup();
    });

    // Close settings popup - close button
    $('#rpg-close-settings').on('click', function() {
        closeSettingsPopup();
    });

    // Close on backdrop click (clicking outside content)
    $('#rpg-settings-popup').on('click', function(e) {
        if (e.target === this) {
            closeSettingsPopup();
        }
    });

    // Clear cache button
    $('#rpg-clear-cache').on('click', function() {
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
            satiety: 100,
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
    });
}

/**
 * Helper function to close the mobile panel with animation.
 */
function closeMobilePanelWithAnimation() {
    const $panel = $('#rpg-companion-panel');
    const $mobileToggle = $('#rpg-mobile-toggle');

    // Add closing class to trigger slide-out animation
    $panel.removeClass('rpg-mobile-open').addClass('rpg-mobile-closing');
    $mobileToggle.removeClass('active');

    // Wait for animation to complete before hiding
    $panel.one('animationend', function() {
        $panel.removeClass('rpg-mobile-closing');
        $('.rpg-mobile-overlay').remove();
    });
}

/**
 * Sets up the mobile toggle button (FAB).
 */
function setupMobileToggle() {
    const $mobileToggle = $('#rpg-mobile-toggle');
    const $panel = $('#rpg-companion-panel');
    const $overlay = $('<div class="rpg-mobile-overlay"></div>');

    // DIAGNOSTIC: Check if elements exist and log setup state
    console.log('[RPG Mobile] ========================================');
    console.log('[RPG Mobile] setupMobileToggle called');
    console.log('[RPG Mobile] Button exists:', $mobileToggle.length > 0, 'jQuery object:', $mobileToggle);
    console.log('[RPG Mobile] Panel exists:', $panel.length > 0);
    console.log('[RPG Mobile] Window width:', window.innerWidth);
    console.log('[RPG Mobile] Is mobile viewport (<=1000):', window.innerWidth <= 1000);
    console.log('[RPG Mobile] ========================================');

    if ($mobileToggle.length === 0) {
        console.error('[RPG Mobile] ERROR: Mobile toggle button not found in DOM!');
        console.error('[RPG Mobile] Cannot attach event handlers - button does not exist');
        return; // Exit early if button doesn't exist
    }

    // Load and apply saved FAB position
    if (extensionSettings.mobileFabPosition) {
        const pos = extensionSettings.mobileFabPosition;
        console.log('[RPG Mobile] Loading saved FAB position:', pos);

        // Apply saved position
        if (pos.top) $mobileToggle.css('top', pos.top);
        if (pos.right) $mobileToggle.css('right', pos.right);
        if (pos.bottom) $mobileToggle.css('bottom', pos.bottom);
        if (pos.left) $mobileToggle.css('left', pos.left);

        // Constrain to viewport after position is applied
        requestAnimationFrame(() => constrainFabToViewport());
    }

    // Touch/drag state
    let isDragging = false;
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let buttonStartX = 0;
    let buttonStartY = 0;
    const LONG_PRESS_DURATION = 200; // ms to hold before enabling drag
    const MOVE_THRESHOLD = 10; // px to move before enabling drag
    let rafId = null; // RequestAnimationFrame ID for smooth updates
    let pendingX = null;
    let pendingY = null;

    // Update position using requestAnimationFrame for smooth rendering
    function updateFabPosition() {
        if (pendingX !== null && pendingY !== null) {
            $mobileToggle.css({
                left: pendingX + 'px',
                top: pendingY + 'px',
                right: 'auto',
                bottom: 'auto'
            });
            pendingX = null;
            pendingY = null;
        }
        rafId = null;
    }

    // Touch start - begin tracking
    $mobileToggle.on('touchstart', function(e) {
        const touch = e.originalEvent.touches[0];

        touchStartTime = Date.now();
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;

        const offset = $mobileToggle.offset();
        buttonStartX = offset.left;
        buttonStartY = offset.top;

        isDragging = false;
    });

    // Touch move - check if should start dragging
    $mobileToggle.on('touchmove', function(e) {
        const touch = e.originalEvent.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const timeSinceStart = Date.now() - touchStartTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Start dragging if held long enough OR moved far enough
        if (!isDragging && (timeSinceStart > LONG_PRESS_DURATION || distance > MOVE_THRESHOLD)) {
            isDragging = true;
            $mobileToggle.addClass('dragging'); // Disable transitions while dragging
        }

        if (isDragging) {
            e.preventDefault(); // Prevent scrolling while dragging

            // Calculate new position
            let newX = buttonStartX + deltaX;
            let newY = buttonStartY + deltaY;

            // Get button dimensions
            const buttonWidth = $mobileToggle.outerWidth();
            const buttonHeight = $mobileToggle.outerHeight();

            // Constrain to viewport with 10px padding
            const minX = 10;
            const maxX = window.innerWidth - buttonWidth - 10;
            const minY = 10;
            const maxY = window.innerHeight - buttonHeight - 10;

            newX = Math.max(minX, Math.min(maxX, newX));
            newY = Math.max(minY, Math.min(maxY, newY));

            // Store pending position and request animation frame for smooth update
            pendingX = newX;
            pendingY = newY;
            if (!rafId) {
                rafId = requestAnimationFrame(updateFabPosition);
            }
        }
    });

    // Mouse drag support for desktop
    let mouseDown = false;

    $mobileToggle.on('mousedown', function(e) {
        // Prevent default to avoid text selection
        e.preventDefault();

        touchStartTime = Date.now();
        touchStartX = e.clientX;
        touchStartY = e.clientY;

        const offset = $mobileToggle.offset();
        buttonStartX = offset.left;
        buttonStartY = offset.top;

        isDragging = false;
        mouseDown = true;
    });

    // Mouse move - only track if mouse is down
    $(document).on('mousemove', function(e) {
        if (!mouseDown) return;

        const deltaX = e.clientX - touchStartX;
        const deltaY = e.clientY - touchStartY;
        const timeSinceStart = Date.now() - touchStartTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Start dragging if held long enough OR moved far enough
        if (!isDragging && (timeSinceStart > LONG_PRESS_DURATION || distance > MOVE_THRESHOLD)) {
            isDragging = true;
            $mobileToggle.addClass('dragging'); // Disable transitions while dragging
        }

        if (isDragging) {
            e.preventDefault();

            // Calculate new position
            let newX = buttonStartX + deltaX;
            let newY = buttonStartY + deltaY;

            // Get button dimensions
            const buttonWidth = $mobileToggle.outerWidth();
            const buttonHeight = $mobileToggle.outerHeight();

            // Constrain to viewport with 10px padding
            const minX = 10;
            const maxX = window.innerWidth - buttonWidth - 10;
            const minY = 10;
            const maxY = window.innerHeight - buttonHeight - 10;

            newX = Math.max(minX, Math.min(maxX, newX));
            newY = Math.max(minY, Math.min(maxY, newY));

            // Store pending position and request animation frame for smooth update
            pendingX = newX;
            pendingY = newY;
            if (!rafId) {
                rafId = requestAnimationFrame(updateFabPosition);
            }
        }
    });

    // Mouse up - save position or let click handler toggle
    $(document).on('mouseup', function(e) {
        if (!mouseDown) return;

        mouseDown = false;

        if (isDragging) {
            // Was dragging - save new position
            const offset = $mobileToggle.offset();
            const newPosition = {
                left: offset.left + 'px',
                top: offset.top + 'px'
            };

            extensionSettings.mobileFabPosition = newPosition;
            saveSettings();

            console.log('[RPG Mobile] Saved new FAB position (mouse):', newPosition);

            // Constrain to viewport bounds (now that position is saved)
            setTimeout(() => constrainFabToViewport(), 10);

            // Re-enable transitions with smooth animation
            setTimeout(() => {
                $mobileToggle.removeClass('dragging');
            }, 50);

            isDragging = false;

            // Prevent click from firing after drag
            e.preventDefault();
            e.stopPropagation();

            // Add flag to prevent click handler from firing
            $mobileToggle.data('just-dragged', true);
            setTimeout(() => {
                $mobileToggle.data('just-dragged', false);
            }, 100);
        }
        // If not dragging, let the click handler toggle the panel
    });

    // Touch end - save position or toggle panel
    $mobileToggle.on('touchend', function(e) {
        // TEMPORARILY COMMENTED FOR DIAGNOSIS - might be blocking click fallback
        // e.preventDefault();

        if (isDragging) {
            // Was dragging - save new position
            const offset = $mobileToggle.offset();
            const newPosition = {
                left: offset.left + 'px',
                top: offset.top + 'px'
            };

            extensionSettings.mobileFabPosition = newPosition;
            saveSettings();

            console.log('[RPG Mobile] Saved new FAB position:', newPosition);

            // Constrain to viewport bounds (now that position is saved)
            setTimeout(() => constrainFabToViewport(), 10);

            // Re-enable transitions with smooth animation
            setTimeout(() => {
                $mobileToggle.removeClass('dragging');
            }, 50);

            isDragging = false;
        } else {
            // Was a tap - toggle panel
            console.log('[RPG Mobile] Quick tap detected - toggling panel');

            if ($panel.hasClass('rpg-mobile-open')) {
                // Close panel with animation
                closeMobilePanelWithAnimation();
            } else {
                // Open panel
                $panel.addClass('rpg-mobile-open');
                $('body').append($overlay);
                $mobileToggle.addClass('active');

                // Close when clicking overlay
                $overlay.on('click', function() {
                    closeMobilePanelWithAnimation();
                });
            }
        }
    });

    // Click handler - works on both mobile and desktop
    $mobileToggle.on('click', function(e) {
        // Skip if we just finished dragging
        if ($mobileToggle.data('just-dragged')) {
            console.log('[RPG Mobile] Click blocked - just finished dragging');
            return;
        }

        console.log('[RPG Mobile] >>> CLICK EVENT FIRED <<<', {
            windowWidth: window.innerWidth,
            isMobileViewport: window.innerWidth <= 1000,
            panelOpen: $panel.hasClass('rpg-mobile-open')
        });

        // Work on both mobile and desktop (removed viewport check)
        if ($panel.hasClass('rpg-mobile-open')) {
            console.log('[RPG Mobile] Click: Closing panel');
            closeMobilePanelWithAnimation();
        } else {
            console.log('[RPG Mobile] Click: Opening panel');
            $panel.addClass('rpg-mobile-open');
            $('body').append($overlay);
            $mobileToggle.addClass('active');

            $overlay.on('click', function() {
                console.log('[RPG Mobile] Overlay clicked - closing panel');
                closeMobilePanelWithAnimation();
            });
        }
    });

    // Handle viewport resize to manage desktop/mobile transitions
    let wasMobile = window.innerWidth <= 1000;
    let resizeTimer;

    $(window).on('resize', function() {
        clearTimeout(resizeTimer);

        const isMobile = window.innerWidth <= 1000;
        const $panel = $('#rpg-companion-panel');
        const $mobileToggle = $('#rpg-mobile-toggle');

        // Transitioning from desktop to mobile - handle immediately for smooth transition
        if (!wasMobile && isMobile) {
            console.log('[RPG Mobile] Transitioning desktop -> mobile');

            // Remove desktop positioning classes
            $panel.removeClass('rpg-position-right rpg-position-left rpg-position-top');

            // Clear collapsed state - mobile doesn't use collapse
            $panel.removeClass('rpg-collapsed');

            // Close panel on mobile with animation
            closeMobilePanelWithAnimation();

            // Clear any inline styles that might be overriding CSS
            $panel.attr('style', '');

            console.log('[RPG Mobile] After cleanup:', {
                panelClasses: $panel.attr('class'),
                inlineStyles: $panel.attr('style'),
                panelPosition: {
                    top: $panel.css('top'),
                    bottom: $panel.css('bottom'),
                    transform: $panel.css('transform'),
                    visibility: $panel.css('visibility')
                }
            });

            // Set up mobile tabs IMMEDIATELY (no debounce delay)
            setupMobileTabs();

            // Update icon for mobile state
            updateCollapseToggleIcon();

            wasMobile = isMobile;
            return;
        }

        // For mobile to desktop transition, use debounce
        resizeTimer = setTimeout(function() {
            const isMobile = window.innerWidth <= 1000;

            // Transitioning from mobile to desktop
            if (wasMobile && !isMobile) {
                // Disable transitions to prevent left→right slide animation
                $panel.css('transition', 'none');

                $panel.removeClass('rpg-mobile-open rpg-mobile-closing');
                $mobileToggle.removeClass('active');
                $('.rpg-mobile-overlay').remove();

                // Restore desktop positioning class
                const position = extensionSettings.panelPosition || 'right';
                $panel.addClass('rpg-position-' + position);

                // Remove mobile tabs structure
                removeMobileTabs();

                // Force reflow to apply position instantly
                $panel[0].offsetHeight;

                // Re-enable transitions after positioned
                setTimeout(function() {
                    $panel.css('transition', '');
                }, 50);
            }

            wasMobile = isMobile;

            // Constrain FAB to viewport after resize (only if user has positioned it)
            constrainFabToViewport();
        }, 150); // Debounce only for mobile→desktop
    });

    // Initialize mobile tabs if starting on mobile
    const isMobile = window.innerWidth <= 1000;
    if (isMobile) {
        const $panel = $('#rpg-companion-panel');
        // Clear any inline styles
        $panel.attr('style', '');

        console.log('[RPG Mobile] Initial load on mobile viewport:', {
            panelClasses: $panel.attr('class'),
            inlineStyles: $panel.attr('style'),
            panelPosition: {
                top: $panel.css('top'),
                bottom: $panel.css('top'),
                transform: $panel.css('transform'),
                visibility: $panel.css('visibility')
            }
        });
        setupMobileTabs();
        // Set initial icon for mobile
        updateCollapseToggleIcon();
    }
}

/**
 * Constrains the mobile FAB button to viewport bounds with top-bar awareness.
 * Only runs when button is in user-controlled state (mobileFabPosition exists).
 * Ensures button never goes behind the top bar or outside viewport edges.
 */
function constrainFabToViewport() {
    // Only constrain if user has set a custom position
    if (!extensionSettings.mobileFabPosition) {
        console.log('[RPG Mobile] Skipping viewport constraint - using CSS defaults');
        return;
    }

    const $mobileToggle = $('#rpg-mobile-toggle');
    if ($mobileToggle.length === 0) return;

    // Skip if button is not visible
    if (!$mobileToggle.is(':visible')) {
        console.log('[RPG Mobile] Skipping viewport constraint - button not visible');
        return;
    }

    // Get current position
    const offset = $mobileToggle.offset();
    if (!offset) return;

    let currentX = offset.left;
    let currentY = offset.top;

    const buttonWidth = $mobileToggle.outerWidth();
    const buttonHeight = $mobileToggle.outerHeight();

    // Get top bar height from CSS variable (fallback to 50px if not set)
    const topBarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topBarBlockSize')) || 50;

    // Calculate viewport bounds with padding
    // Use top bar height + extra padding for top bound
    const minX = 10;
    const maxX = window.innerWidth - buttonWidth - 10;
    const minY = topBarHeight + 60; // Top bar + extra space for visibility
    const maxY = window.innerHeight - buttonHeight - 10;

    // Constrain to bounds
    let newX = Math.max(minX, Math.min(maxX, currentX));
    let newY = Math.max(minY, Math.min(maxY, currentY));

    // Only update if position changed
    if (newX !== currentX || newY !== currentY) {
        console.log('[RPG Mobile] Constraining FAB to viewport:', {
            old: { x: currentX, y: currentY },
            new: { x: newX, y: newY },
            viewport: { width: window.innerWidth, height: window.innerHeight },
            topBarHeight
        });

        // Apply new position
        $mobileToggle.css({
            left: newX + 'px',
            top: newY + 'px',
            right: 'auto',
            bottom: 'auto'
        });

        // Save corrected position
        extensionSettings.mobileFabPosition = {
            left: newX + 'px',
            top: newY + 'px'
        };
        saveSettings();
    }
}

/**
 * Sets up mobile tab navigation for organizing content.
 * Only runs on mobile viewports (<=1000px).
 */
function setupMobileTabs() {
    const isMobile = window.innerWidth <= 1000;
    if (!isMobile) return;

    // Check if tabs already exist
    if ($('.rpg-mobile-tabs').length > 0) return;

    const $panel = $('#rpg-companion-panel');
    const $contentBox = $panel.find('.rpg-content-box');

    // Get existing sections
    const $userStats = $('#rpg-user-stats');
    const $infoBox = $('#rpg-info-box');
    const $thoughts = $('#rpg-thoughts');

    // If no sections exist, nothing to organize
    if ($userStats.length === 0 && $infoBox.length === 0 && $thoughts.length === 0) {
        return;
    }

    // Create tab navigation (only show tabs for sections that exist)
    const tabs = [];
    const hasInfoOrCharacters = $infoBox.length > 0 || $thoughts.length > 0;

    if ($userStats.length > 0) {
        tabs.push('<button class="rpg-mobile-tab active" data-tab="stats"><i class="fa-solid fa-chart-bar"></i><span>Stats</span></button>');
    }
    // Combine Info and Characters into one tab
    if (hasInfoOrCharacters) {
        tabs.push('<button class="rpg-mobile-tab ' + (tabs.length === 0 ? 'active' : '') + '" data-tab="info-characters"><i class="fa-solid fa-book"></i><span>Info</span></button>');
    }

    const $tabNav = $('<div class="rpg-mobile-tabs">' + tabs.join('') + '</div>');

    // Determine which tab should be active
    let firstTab = '';
    if ($userStats.length > 0) firstTab = 'stats';
    else if (hasInfoOrCharacters) firstTab = 'info-characters';

    // Create tab content wrappers
    const $statsTab = $('<div class="rpg-mobile-tab-content ' + (firstTab === 'stats' ? 'active' : '') + '" data-tab-content="stats"></div>');
    const $infoCharactersTab = $('<div class="rpg-mobile-tab-content ' + (firstTab === 'info-characters' ? 'active' : '') + '" data-tab-content="info-characters"></div>');

    // Create combined content wrapper for Info and Characters
    const $combinedWrapper = $('<div class="rpg-mobile-combined-content"></div>');

    // Move sections into their respective tabs (detach to preserve event handlers)
    if ($userStats.length > 0) {
        $statsTab.append($userStats.detach());
        $userStats.show();
    }
    if ($infoBox.length > 0) {
        $combinedWrapper.append($infoBox.detach());
        $infoBox.show();
    }
    if ($thoughts.length > 0) {
        $combinedWrapper.append($thoughts.detach());
        $thoughts.show();
    }

    // Add combined wrapper to the info-characters tab
    if (hasInfoOrCharacters) {
        $infoCharactersTab.append($combinedWrapper);
    }

    // Hide dividers on mobile
    $('.rpg-divider').hide();

    // Build mobile tab structure
    const $mobileContainer = $('<div class="rpg-mobile-container"></div>');
    $mobileContainer.append($tabNav);

    // Only append tab content wrappers that have content
    if ($userStats.length > 0) $mobileContainer.append($statsTab);
    if (hasInfoOrCharacters) $mobileContainer.append($infoCharactersTab);

    // Insert mobile tab structure at the beginning of content box
    $contentBox.prepend($mobileContainer);

    // Handle tab switching
    $tabNav.find('.rpg-mobile-tab').on('click', function() {
        const tabName = $(this).data('tab');

        // Update active tab button
        $tabNav.find('.rpg-mobile-tab').removeClass('active');
        $(this).addClass('active');

        // Update active tab content
        $mobileContainer.find('.rpg-mobile-tab-content').removeClass('active');
        $mobileContainer.find('[data-tab-content="' + tabName + '"]').addClass('active');
    });
}

/**
 * Removes mobile tab navigation and restores desktop layout.
 */
function removeMobileTabs() {
    // Get sections from tabs before removing
    const $userStats = $('#rpg-user-stats').detach();
    const $infoBox = $('#rpg-info-box').detach();
    const $thoughts = $('#rpg-thoughts').detach();

    // Remove mobile tab container
    $('.rpg-mobile-container').remove();

    // Get dividers
    const $dividerStats = $('#rpg-divider-stats');
    const $dividerInfo = $('#rpg-divider-info');

    // Restore original sections to content box in correct order
    const $contentBox = $('.rpg-content-box');

    // Re-insert sections in original order
    if ($dividerStats.length) {
        $dividerStats.before($userStats);
        $dividerInfo.before($infoBox);
        $contentBox.append($thoughts);
    } else {
        // Fallback if dividers don't exist
        $contentBox.prepend($thoughts);
        $contentBox.prepend($infoBox);
        $contentBox.prepend($userStats);
    }

    // Show sections and dividers
    $userStats.show();
    $infoBox.show();
    $thoughts.show();
    $('.rpg-divider').show();
}

/**
 * Sets up mobile keyboard handling using Visual Viewport API.
 * Prevents layout squashing when keyboard appears by detecting
 * viewport changes and adding CSS classes for adjustment.
 */
function setupMobileKeyboardHandling() {
    if (!window.visualViewport) {
        // console.log('[RPG Mobile] Visual Viewport API not supported');
        return;
    }

    const $panel = $('#rpg-companion-panel');
    let keyboardVisible = false;

    // Listen for viewport resize (keyboard show/hide)
    window.visualViewport.addEventListener('resize', () => {
        // Only handle if panel is open on mobile
        if (!$panel.hasClass('rpg-mobile-open')) return;

        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;

        // Keyboard visible if viewport significantly smaller than window
        // Using 75% threshold to account for browser UI variations
        const isKeyboardShowing = viewportHeight < windowHeight * 0.75;

        if (isKeyboardShowing && !keyboardVisible) {
            // Keyboard just appeared
            keyboardVisible = true;
            $panel.addClass('rpg-keyboard-visible');
            // console.log('[RPG Mobile] Keyboard opened');
        } else if (!isKeyboardShowing && keyboardVisible) {
            // Keyboard just disappeared
            keyboardVisible = false;
            $panel.removeClass('rpg-keyboard-visible');
            // console.log('[RPG Mobile] Keyboard closed');
        }
    });
}

/**
 * Handles focus on contenteditable fields to ensure they're visible when keyboard appears.
 * Uses smooth scrolling to bring focused field into view with proper padding.
 */
function setupContentEditableScrolling() {
    const $panel = $('#rpg-companion-panel');

    // Use event delegation for all contenteditable fields
    $panel.on('focusin', '[contenteditable="true"]', function(e) {
        const $field = $(this);

        // Small delay to let keyboard animate in
        setTimeout(() => {
            // Scroll field into view with padding
            // Using 'center' to ensure field is in middle of viewport
            $field[0].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }, 300);
    });
}

/**
 * Sets up the collapse/expand toggle button for side panels.
 */
function setupCollapseToggle() {
    const $collapseToggle = $('#rpg-collapse-toggle');
    const $panel = $('#rpg-companion-panel');
    const $icon = $collapseToggle.find('i');

    $collapseToggle.on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const isMobile = window.innerWidth <= 1000;

        // On mobile: button toggles panel open/closed (same as desktop behavior)
        if (isMobile) {
            const isOpen = $panel.hasClass('rpg-mobile-open');
            console.log('[RPG Mobile] Collapse toggle clicked. Current state:', {
                isOpen,
                panelClasses: $panel.attr('class'),
                inlineStyles: $panel.attr('style'),
                panelPosition: {
                    top: $panel.css('top'),
                    bottom: $panel.css('bottom'),
                    transform: $panel.css('transform'),
                    visibility: $panel.css('visibility')
                }
            });

            if (isOpen) {
                // Close panel with animation
                console.log('[RPG Mobile] Closing panel');
                closeMobilePanelWithAnimation();
            } else {
                // Open panel
                console.log('[RPG Mobile] Opening panel');
                $panel.addClass('rpg-mobile-open');
                const $overlay = $('<div class="rpg-mobile-overlay"></div>');
                $('body').append($overlay);

                // Debug: Check state after animation should complete
                setTimeout(() => {
                    console.log('[RPG Mobile] 500ms after opening:', {
                        panelClasses: $panel.attr('class'),
                        hasOpenClass: $panel.hasClass('rpg-mobile-open'),
                        visibility: $panel.css('visibility'),
                        transform: $panel.css('transform'),
                        display: $panel.css('display'),
                        opacity: $panel.css('opacity')
                    });
                }, 500);

                // Close when clicking overlay
                $overlay.on('click', function() {
                    console.log('[RPG Mobile] Overlay clicked - closing panel');
                    closeMobilePanelWithAnimation();
                    updateCollapseToggleIcon();
                });
            }

            // Update icon to reflect new state
            updateCollapseToggleIcon();

            console.log('[RPG Mobile] After toggle:', {
                panelClasses: $panel.attr('class'),
                inlineStyles: $panel.attr('style'),
                panelPosition: {
                    top: $panel.css('top'),
                    bottom: $panel.css('bottom'),
                    transform: $panel.css('transform'),
                    visibility: $panel.css('visibility')
                },
                gameContainer: {
                    opacity: $('.rpg-game-container').css('opacity'),
                    visibility: $('.rpg-game-container').css('visibility')
                }
            });
            return;
        }

        // Desktop behavior: collapse/expand side panel
        const isCollapsed = $panel.hasClass('rpg-collapsed');

        if (isCollapsed) {
            // Expand panel
            $panel.removeClass('rpg-collapsed');

            // Update icon based on position
            if ($panel.hasClass('rpg-position-right')) {
                $icon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
            } else if ($panel.hasClass('rpg-position-left')) {
                $icon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
            }
        } else {
            // Collapse panel
            $panel.addClass('rpg-collapsed');

            // Update icon based on position
            if ($panel.hasClass('rpg-position-right')) {
                $icon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
            } else if ($panel.hasClass('rpg-position-left')) {
                $icon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
            }
        }
    });

    // Set initial icon direction based on panel position
    updateCollapseToggleIcon();
}

/**
 * Updates the collapse toggle icon direction based on panel position.
 */
function updateCollapseToggleIcon() {
    const $collapseToggle = $('#rpg-collapse-toggle');
    const $panel = $('#rpg-companion-panel');
    const $icon = $collapseToggle.find('i');
    const isMobile = window.innerWidth <= 1000;

    if (isMobile) {
        // Mobile: slides from right, use same icon logic as desktop right panel
        const isOpen = $panel.hasClass('rpg-mobile-open');
        console.log('[RPG Mobile] updateCollapseToggleIcon:', {
            isMobile: true,
            isOpen,
            settingIcon: isOpen ? 'chevron-left' : 'chevron-right'
        });
        if (isOpen) {
            // Panel open - chevron points left (to close/slide back right)
            $icon.removeClass('fa-chevron-down fa-chevron-up fa-chevron-right').addClass('fa-chevron-left');
        } else {
            // Panel closed - chevron points right (to open/slide in from right)
            $icon.removeClass('fa-chevron-down fa-chevron-up fa-chevron-left').addClass('fa-chevron-right');
        }
    } else {
        // Desktop: icon direction based on panel position and collapsed state
        const isCollapsed = $panel.hasClass('rpg-collapsed');

        if (isCollapsed) {
            // When collapsed, arrow points inward (to expand)
            if ($panel.hasClass('rpg-position-right')) {
                $icon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
            } else if ($panel.hasClass('rpg-position-left')) {
                $icon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
            }
        } else {
            // When expanded, arrow points outward (to collapse)
            if ($panel.hasClass('rpg-position-right')) {
                $icon.removeClass('fa-chevron-left').addClass('fa-chevron-right');
            } else if ($panel.hasClass('rpg-position-left')) {
                $icon.removeClass('fa-chevron-right').addClass('fa-chevron-left');
            }
        }
    }
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
    // Note: rpg-companion-plot is not cleared here since it's passed via quiet_prompt option
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

    const isMobile = window.innerWidth <= 1000;

    // Remove all position classes
    $panelContainer.removeClass('rpg-position-left rpg-position-right rpg-position-top');

    // On mobile, don't apply desktop position classes
    if (isMobile) {
        return;
    }

    // Desktop: Add the appropriate position class
    $panelContainer.addClass(`rpg-position-${extensionSettings.panelPosition}`);

    // Update collapse toggle icon direction for new position
    updateCollapseToggleIcon();
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

// Rendering functions removed - now imported from src/systems/rendering/*
// (renderUserStats, renderInfoBox, renderThoughts, updateInfoBoxField,
//  updateCharacterField, updateChatThoughts, createThoughtPanel)


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
            await updateRPGData(renderUserStats, renderInfoBox, renderThoughts);
        }, 500);
    }

    // Reset the swipe flag after generation completes
    // This ensures that if the user swiped → auto-reply generated → flag is now cleared
    // so the next user message will be treated as a new message (not a swipe)
    if (lastActionWasSwipe) {
        // console.log('[RPG Companion] 🔄 Generation complete after swipe - resetting lastActionWasSwipe to false');
        lastActionWasSwipe = false;
    }

    // Clear plot progression flag if this was a plot progression generation
    // Note: No need to clear extension prompt since we used quiet_prompt option
    if (isPlotProgression) {
        isPlotProgression = false;
        console.log('[RPG Companion] Plot progression generation completed');
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
 * Automatically imports the HTML cleaning regex script if it doesn't already exist.
 * This regex removes HTML tags from outgoing prompts to prevent formatting issues.
 */
async function ensureHtmlCleaningRegex() {
    try {
        // Check if the HTML cleaning regex already exists
        const scriptName = 'Clean HTML (From Outgoing Prompt)';
        const existingScripts = st_extension_settings?.regex || [];
        const alreadyExists = existingScripts.some(script => script.scriptName === scriptName);

        if (alreadyExists) {
            console.log('[RPG Companion] HTML cleaning regex already exists, skipping import');
            return;
        }

        // Generate a UUID for the script
        const uuidv4 = () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        // Create the regex script object based on the attached file
        const regexScript = {
            id: uuidv4(),
            scriptName: scriptName,
            findRegex: '/\\s?<(?!\\!--)(?:\"[^\"]*\"|\'[^\']*\'|[^\'\">])*>/g',
            replaceString: '',
            trimStrings: [],
            placement: [2], // 2 = Input (affects outgoing prompt)
            disabled: false,
            markdownOnly: false,
            promptOnly: true,
            runOnEdit: true,
            substituteRegex: 0,
            minDepth: null,
            maxDepth: null
        };

        // Add to global regex scripts
        if (!Array.isArray(st_extension_settings.regex)) {
            st_extension_settings.regex = [];
        }

        st_extension_settings.regex.push(regexScript);

        // Save the changes using the already-imported function
        saveSettingsDebounced();

        console.log('[RPG Companion] ✅ HTML cleaning regex imported successfully');
    } catch (error) {
        console.error('[RPG Companion] Failed to import HTML cleaning regex:', error);
        // Don't throw - this is a nice-to-have feature
    }
}

/**
 * Update the persona avatar image when user switches personas
 */
function updatePersonaAvatar() {
    const portraitImg = document.querySelector('.rpg-user-portrait');
    if (!portraitImg) {
        console.log('[RPG Companion] Portrait image element not found in DOM');
        return;
    }

    // Get current user_avatar from context instead of using imported value
    const context = getContext();
    const currentUserAvatar = context.user_avatar || user_avatar;

    console.log('[RPG Companion] Attempting to update persona avatar:', currentUserAvatar);

    // Try to get a valid thumbnail URL using our safe helper
    if (currentUserAvatar) {
        const thumbnailUrl = getSafeThumbnailUrl('persona', currentUserAvatar);

        if (thumbnailUrl) {
            // Only update the src if we got a valid URL
            portraitImg.src = thumbnailUrl;
            console.log('[RPG Companion] Persona avatar updated successfully');
        } else {
            // Don't update the src if we couldn't get a valid URL
            // This prevents 400 errors and keeps the existing image
            console.warn('[RPG Companion] Could not get valid thumbnail URL for persona avatar, keeping existing image');
        }
    } else {
        console.log('[RPG Companion] No user avatar configured, keeping existing image');
    }
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

        // Import the HTML cleaning regex if needed
        await ensureHtmlCleaningRegex();

        // Register event listeners
        eventSource.on(event_types.MESSAGE_SENT, onMessageSent);
        eventSource.on(event_types.GENERATION_STARTED, onGenerationStarted);
        eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
        // Removed CHARACTER_MESSAGE_RENDERED to prevent race condition with cleaned messages
        eventSource.on(event_types.CHAT_CHANGED, onCharacterChanged);
        eventSource.on(event_types.MESSAGE_SWIPED, onMessageSwiped);
        // Update persona avatar when user switches personas or chat changes
        eventSource.on(event_types.CHAT_CHANGED, updatePersonaAvatar);
        eventSource.on(event_types.USER_MESSAGE_RENDERED, updatePersonaAvatar);
        eventSource.on(event_types.SETTINGS_UPDATED, updatePersonaAvatar);

        // console.log('[RPG Companion] Extension loaded successfully');
    } catch (error) {
        console.error('[RPG Companion] Failed to initialize:', error);
        throw error;
    }
});
