/**
 * Debug UI Module
 * Provides mobile-friendly debug log viewer for troubleshooting parsing issues
 */

import { extensionSettings, getDebugLogs, clearDebugLogs } from '../../core/state.js';

/**
 * Creates and injects the debug panel into the page
 */
export function createDebugPanel() {
    // Remove existing debug panel if any
    $('#rpg-debug-panel').remove();
    $('#rpg-debug-toggle').remove();

    // Create debug panel HTML
    const debugPanelHtml = `
        <div id="rpg-debug-panel" class="rpg-debug-panel">
            <div class="rpg-debug-header">
                <h3>🔍 Debug Logs</h3>
                <div class="rpg-debug-actions">
                    <button id="rpg-debug-copy" title="Copy logs to clipboard">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button id="rpg-debug-clear" title="Clear logs">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    <button id="rpg-debug-close" title="Close debug panel">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
            <div id="rpg-debug-logs" class="rpg-debug-logs"></div>
        </div>
    `;

    // Create debug toggle button (FAB-style)
    const debugToggleHtml = `
        <button id="rpg-debug-toggle" class="rpg-debug-toggle" title="Toggle Debug Logs">
            <i class="fa-solid fa-bug"></i>
        </button>
    `;

    // Append to body
    $('body').append(debugPanelHtml);
    $('body').append(debugToggleHtml);

    // Set up event handlers
    setupDebugEventHandlers();

    // Initial log render
    renderDebugLogs();
}

/**
 * Sets up event handlers for debug panel
 */
function setupDebugEventHandlers() {
    // Toggle button
    $('#rpg-debug-toggle').on('click', function() {
        $('#rpg-debug-panel').toggleClass('rpg-debug-open');
        renderDebugLogs(); // Refresh logs when opening
    });

    // Close button
    $('#rpg-debug-close').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[RPG Debug] Close button clicked');
        $('#rpg-debug-panel').removeClass('rpg-debug-open');
    });

    // Copy button
    $('#rpg-debug-copy').on('click', function() {
        const logs = getDebugLogs();
        const logsText = logs.map(log => {
            let text = `[${log.timestamp}] ${log.message}`;
            if (log.data) {
                text += `\n${log.data}`;
            }
            return text;
        }).join('\n\n');

        navigator.clipboard.writeText(logsText).then(() => {
            // Show feedback
            const $btn = $(this);
            const $icon = $btn.find('i');
            $icon.removeClass('fa-copy').addClass('fa-check');
            setTimeout(() => {
                $icon.removeClass('fa-check').addClass('fa-copy');
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy logs:', err);
            alert('Failed to copy logs. Please use browser console instead.');
        });
    });

    // Clear button
    $('#rpg-debug-clear').on('click', function() {
        if (confirm('Clear all debug logs?')) {
            clearDebugLogs();
            renderDebugLogs();
        }
    });
}

/**
 * Renders debug logs to the panel
 */
function renderDebugLogs() {
    const logs = getDebugLogs();
    const $logsContainer = $('#rpg-debug-logs');

    if (logs.length === 0) {
        $logsContainer.html('<div class="rpg-debug-empty">No logs yet. Logs will appear when parser runs.</div>');
        return;
    }

    // Build logs HTML
    const logsHtml = logs.map(log => {
        let html = `<div class="rpg-debug-entry">`;
        html += `<span class="rpg-debug-time">[${log.timestamp}]</span> `;
        html += `<span class="rpg-debug-message">${escapeHtml(log.message)}</span>`;
        if (log.data) {
            html += `<pre class="rpg-debug-data">${escapeHtml(log.data)}</pre>`;
        }
        html += `</div>`;
        return html;
    }).join('');

    $logsContainer.html(logsHtml);

    // Auto-scroll to bottom
    $logsContainer[0].scrollTop = $logsContainer[0].scrollHeight;
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Shows or hides debug UI based on debug mode setting
 */
export function updateDebugUIVisibility() {
    if (extensionSettings.debugMode) {
        if ($('#rpg-debug-panel').length === 0) {
            createDebugPanel();
        }
        $('#rpg-debug-toggle').show();
    } else {
        $('#rpg-debug-toggle').hide();
        $('#rpg-debug-panel').remove();
    }
}
