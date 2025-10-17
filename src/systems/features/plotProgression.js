/**
 * Plot Progression Module
 * Handles plot buttons (Random/Natural) UI setup
 */

import { togglePlotButtons } from '../ui/layout.js';

/**
 * Sets up the plot progression buttons inside the send form area.
 * @param {Function} handlePlotClick - Callback function to handle plot button clicks
 */
export function setupPlotButtons(handlePlotClick) {
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
    $('#rpg-plot-random').on('click', () => handlePlotClick('random'));
    $('#rpg-plot-natural').on('click', () => handlePlotClick('natural'));

    // Show/hide based on setting
    togglePlotButtons();
}
