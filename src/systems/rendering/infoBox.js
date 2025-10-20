/**
 * Info Box Rendering Module
 * Handles rendering of the info box dashboard with weather, date, time, and location widgets
 */

import { getContext } from '../../../../../../extensions.js';
import {
    extensionSettings,
    lastGeneratedData,
    committedTrackerData,
    $infoBoxContainer
} from '../../core/state.js';
import { saveChatData } from '../../core/persistence.js';

/**
 * Renders the info box as a visual dashboard with calendar, weather, temperature, clock, and map widgets.
 * Includes event listeners for editable fields.
 */
export function renderInfoBox() {
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
                    <div class="rpg-placeholder-hint">Generate a new response in the roleplay or switch to "Separate Generation" in Settings to access and click the "Refresh RPG Info" button</div>
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

        // Support both new text format (Date:) and legacy emoji format (🗓️:)
        if (line.startsWith('Date:') || line.includes('🗓️:')) {
            // console.log('[RPG Companion] → Matched DATE');
            const dateStr = line.replace('Date:', '').replace('🗓️:', '').trim();
            // Parse format: "Weekday, Month Day, Year" or "Weekday, Month, Year"
            const dateParts = dateStr.split(',').map(p => p.trim());
            data.weekday = dateParts[0] || '';
            data.month = dateParts[1] || '';
            data.year = dateParts[2] || '';
            data.date = dateStr;
        } else if (line.startsWith('Temperature:') || line.includes('🌡️:')) {
            // console.log('[RPG Companion] → Matched TEMPERATURE');
            const tempStr = line.replace('Temperature:', '').replace('🌡️:', '').trim();
            data.temperature = tempStr;
            // Extract numeric value
            const tempMatch = tempStr.match(/(-?\d+)/);
            if (tempMatch) {
                data.tempValue = parseInt(tempMatch[1]);
            }
        } else if (line.startsWith('Time:') || line.includes('🕒:')) {
            // console.log('[RPG Companion] → Matched TIME');
            const timeStr = line.replace('Time:', '').replace('🕒:', '').trim();
            data.time = timeStr;
            // Parse "HH:MM → HH:MM" format
            const timeParts = timeStr.split('→').map(t => t.trim());
            data.timeStart = timeParts[0] || '';
            data.timeEnd = timeParts[1] || '';
        } else if (line.startsWith('Location:') || line.includes('🗺️:')) {
            // console.log('[RPG Companion] → Matched LOCATION');
            data.location = line.replace('Location:', '').replace('🗺️:', '').trim();
        } else if (line.startsWith('Weather:')) {
            // New text format: Weather: [Emoji], [Forecast]
            const weatherStr = line.replace('Weather:', '').trim();
            const weatherParts = weatherStr.split(',').map(p => p.trim());
            data.weatherEmoji = weatherParts[0] || '';
            data.weatherForecast = weatherParts[1] || '';
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

    // Calendar widget - always show (editable even if empty)
    const monthShort = data.month ? data.month.substring(0, 3).toUpperCase() : 'MON';
    const weekdayShort = data.weekday ? data.weekday.substring(0, 3).toUpperCase() : 'DAY';
    const yearDisplay = data.year || 'YEAR';
    html += `
        <div class="rpg-dashboard-widget rpg-calendar-widget">
            <div class="rpg-calendar-top rpg-editable" contenteditable="true" data-field="month" title="Click to edit">${monthShort}</div>
            <div class="rpg-calendar-day rpg-editable" contenteditable="true" data-field="weekday" title="Click to edit">${weekdayShort}</div>
            <div class="rpg-calendar-year rpg-editable" contenteditable="true" data-field="year" title="Click to edit">${yearDisplay}</div>
        </div>
    `;

    // Weather widget - always show (editable even if empty)
    const weatherEmoji = data.weatherEmoji || '🌤️';
    const weatherForecast = data.weatherForecast || 'Weather';
    html += `
        <div class="rpg-dashboard-widget rpg-weather-widget">
            <div class="rpg-weather-icon rpg-editable" contenteditable="true" data-field="weatherEmoji" title="Click to edit emoji">${weatherEmoji}</div>
            <div class="rpg-weather-forecast rpg-editable" contenteditable="true" data-field="weatherForecast" title="Click to edit">${weatherForecast}</div>
        </div>
    `;

    // Temperature widget - always show (editable even if empty)
    const tempDisplay = data.temperature || '20°C';
    const tempValue = data.tempValue || 20;
    const tempPercent = Math.min(100, Math.max(0, ((tempValue + 20) / 60) * 100));
    const tempColor = tempValue < 10 ? '#4a90e2' : tempValue < 25 ? '#67c23a' : '#e94560';
    html += `
        <div class="rpg-dashboard-widget rpg-temp-widget">
            <div class="rpg-thermometer">
                <div class="rpg-thermometer-bulb"></div>
                <div class="rpg-thermometer-tube">
                    <div class="rpg-thermometer-fill" style="height: ${tempPercent}%; background: ${tempColor}"></div>
                </div>
            </div>
            <div class="rpg-temp-value rpg-editable" contenteditable="true" data-field="temperature" title="Click to edit">${tempDisplay}</div>
        </div>
    `;

    // Time widget - always show (editable even if empty)
    const timeDisplay = data.timeStart || '12:00';
    // Parse time for clock hands
    const timeMatch = timeDisplay.match(/(\d+):(\d+)/);
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
            <div class="rpg-time-value rpg-editable" contenteditable="true" data-field="timeStart" title="Click to edit">${timeDisplay}</div>
        </div>
    `;

    html += '</div>';

    // Row 2: Location widget (full width) - always show (editable even if empty)
    const locationDisplay = data.location || 'Location';
    html += `
        <div class="rpg-dashboard rpg-dashboard-row-2">
            <div class="rpg-dashboard-widget rpg-location-widget">
                <div class="rpg-map-bg">
                    <div class="rpg-map-marker">📍</div>
                </div>
                <div class="rpg-location-text rpg-editable" contenteditable="true" data-field="location" title="Click to edit">${locationDisplay}</div>
            </div>
        </div>
    `;

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
 * Updates a specific field in the Info Box data and re-renders.
 * Handles complex field reconstruction logic for date parts, weather, temperature, time, and location.
 *
 * @param {string} field - Field name to update
 * @param {string} value - New value for the field
 */
export function updateInfoBoxField(field, value) {
    if (!lastGeneratedData.infoBox) {
        // Initialize with empty info box if it doesn't exist
        lastGeneratedData.infoBox = 'Info Box\n---\n';
    }

    // Reconstruct the Info Box text with updated field
    const lines = lastGeneratedData.infoBox.split('\n');
    let dateLineFound = false;
    let dateLineIndex = -1;

    // Find the date line
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('🗓️:')) {
            dateLineFound = true;
            dateLineIndex = i;
            break;
        }
    }

    const updatedLines = lines.map((line, index) => {
        if (field === 'month' && line.includes('🗓️:')) {
            const parts = line.split(',');
            if (parts.length >= 2) {
                // parts[0] = "🗓️: Weekday", parts[1] = " Month", parts[2] = " Year"
                parts[1] = ' ' + value;
                return parts.join(',');
            } else if (parts.length === 1) {
                // No existing month/year, add them
                return `${parts[0]}, ${value}, YEAR`;
            }
        } else if (field === 'weekday' && line.includes('🗓️:')) {
            const parts = line.split(',');
            // Keep the emoji, just update the weekday
            const month = parts[1] ? parts[1].trim() : 'Month';
            const year = parts[2] ? parts[2].trim() : 'YEAR';
            return `🗓️: ${value}, ${month}, ${year}`;
        } else if (field === 'year' && line.includes('🗓️:')) {
            const parts = line.split(',');
            if (parts.length >= 3) {
                parts[2] = ' ' + value;
                return parts.join(',');
            } else if (parts.length === 2) {
                // No existing year, add it
                return `${parts[0]}, ${parts[1]}, ${value}`;
            } else if (parts.length === 1) {
                // No existing month/year, add them
                return `${parts[0]}, Month, ${value}`;
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
            // When user edits, set both start and end time to the new value
            return `🕒: ${value} → ${value}`;
        } else if (field === 'location' && line.includes('🗺️:')) {
            return `🗺️: ${value}`;
        }
        return line;
    });

    // If editing a date field but no date line exists, create one after the divider
    if ((field === 'month' || field === 'weekday' || field === 'year') && !dateLineFound) {
        // Find the divider line
        const dividerIndex = updatedLines.findIndex(line => line.includes('---'));
        if (dividerIndex >= 0) {
            // Create initial date line with the edited field
            let newDateLine = '';
            if (field === 'weekday') {
                newDateLine = `🗓️: ${value}, Month, YEAR`;
            } else if (field === 'month') {
                newDateLine = `🗓️: Weekday, ${value}, YEAR`;
            } else if (field === 'year') {
                newDateLine = `🗓️: Weekday, Month, ${value}`;
            }
            // Insert after the divider
            updatedLines.splice(dividerIndex + 1, 0, newDateLine);
        }
    }

    // If editing weather but no weather line exists, create one
    if ((field === 'weatherEmoji' || field === 'weatherForecast')) {
        let weatherLineFound = false;
        for (const line of updatedLines) {
            // Check if this is a weather line (has emoji and forecast, not one of the special fields)
            if (line.match(/^[^:]+:\s*.+$/) && !line.includes('🗓️') && !line.includes('🌡️') && !line.includes('🕒') && !line.includes('🗺️') && !line.includes('Info Box') && !line.includes('---')) {
                weatherLineFound = true;
                break;
            }
        }

        if (!weatherLineFound) {
            const dividerIndex = updatedLines.findIndex(line => line.includes('---'));
            if (dividerIndex >= 0) {
                let newWeatherLine = '';
                if (field === 'weatherEmoji') {
                    newWeatherLine = `${value}: Weather`;
                } else if (field === 'weatherForecast') {
                    newWeatherLine = `🌤️: ${value}`;
                }
                // Insert after date line if it exists, otherwise after divider
                const dateIndex = updatedLines.findIndex(line => line.includes('🗓️:'));
                const insertIndex = dateIndex >= 0 ? dateIndex + 1 : dividerIndex + 1;
                updatedLines.splice(insertIndex, 0, newWeatherLine);
            }
        }
    }

    // If editing temperature but no temperature line exists, create one
    if (field === 'temperature') {
        const tempLineFound = updatedLines.some(line => line.includes('🌡️:'));
        if (!tempLineFound) {
            const dividerIndex = updatedLines.findIndex(line => line.includes('---'));
            if (dividerIndex >= 0) {
                const newTempLine = `🌡️: ${value}`;
                // Find last non-empty line before creating position
                let insertIndex = dividerIndex + 1;
                for (let i = 0; i < updatedLines.length; i++) {
                    if (updatedLines[i].includes('🗓️:') || updatedLines[i].match(/^[^:]+:\s*.+$/)) {
                        insertIndex = i + 1;
                    }
                }
                updatedLines.splice(insertIndex, 0, newTempLine);
            }
        }
    }

    // If editing time but no time line exists, create one
    if (field === 'timeStart') {
        const timeLineFound = updatedLines.some(line => line.includes('🕒:'));
        if (!timeLineFound) {
            const dividerIndex = updatedLines.findIndex(line => line.includes('---'));
            if (dividerIndex >= 0) {
                const newTimeLine = `🕒: ${value} → ${value}`;
                // Find last non-empty line before creating position
                let insertIndex = dividerIndex + 1;
                for (let i = 0; i < updatedLines.length; i++) {
                    if (updatedLines[i].includes('🗓️:') || updatedLines[i].includes('🌡️:') || updatedLines[i].match(/^[^:]+:\s*.+$/)) {
                        insertIndex = i + 1;
                    }
                }
                updatedLines.splice(insertIndex, 0, newTimeLine);
            }
        }
    }

    // If editing location but no location line exists, create one
    if (field === 'location') {
        const locationLineFound = updatedLines.some(line => line.includes('🗺️:'));
        if (!locationLineFound) {
            const dividerIndex = updatedLines.findIndex(line => line.includes('---'));
            if (dividerIndex >= 0) {
                const newLocationLine = `🗺️: ${value}`;
                // Insert at the end (before any empty lines)
                let insertIndex = updatedLines.length;
                for (let i = updatedLines.length - 1; i >= 0; i--) {
                    if (updatedLines[i].trim() !== '') {
                        insertIndex = i + 1;
                        break;
                    }
                }
                updatedLines.splice(insertIndex, 0, newLocationLine);
            }
        }
    }

    lastGeneratedData.infoBox = updatedLines.join('\n');

    // Update BOTH lastGeneratedData AND committedTrackerData
    // This makes manual edits immediately visible to AI
    committedTrackerData.infoBox = updatedLines.join('\n');

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
