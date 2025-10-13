# RPG Companion Extension for SillyTavern

An immersive RPG extension that tracks character stats, scene information, and character thoughts in a beautiful, customizable UI panel. All automated! Works with any preset. Choose between Together or Separate generation modes for context and generations control.

[![Discord](https://img.shields.io/badge/Discord-Join%20Server-7289da)](https://discord.com/invite/KdAkTg94ME)
[![Support](https://img.shields.io/badge/Ko--fi-Support%20Creator-ff5e5b)](https://ko-fi.com/marinara_spaghetti)

## ✨ Features

### Core Functionality

- **📊 User Stats Tracker**: Visual progress bars for health, sustenance, energy, hygiene, arousal, mood, and conditions
- **🌍 Info Box Dashboard**: Beautiful widgets displaying date, weather, temperature, time, and location
- **💭 Character Thoughts**: Floating thought bubbles showing AI characters' internal monologue (editable in real-time!)
- **🎲 Classic RPG Stats**: STR, DEX, CON, INT, WIS, CHA attributes with dice roll support
- **📦 Inventory System**: Track items your character is carrying
- **🎨 Multiple Themes**: Cyberpunk, Fantasy, Minimal, Dark, Light, and Custom themes
- **✏️ Live Editing**: Edit stats, thoughts, weather, and more directly in the panels
- **💾 Per-Swipe Data Storage**: Each swipe preserves its own tracker data

### Smart Features

- **🔄 Swipe Detection**: Automatically handles swipes and maintains correct tracker context
- **📝 Context-Aware**: Weather, stats, and character states naturally influence the narrative
- **🎭 Multiple Characters**: Tracks thoughts and relationships for all present characters
- **📍 Thought Bubbles in Chat**: Optional floating thought bubbles positioned next to character avatars
- **🌈 Customizable Colors**: Create your own theme with custom color schemes
- **📱 Mobile Responsive**: Works beautifully on all devices

## 📥 Installation

1. Download or clone this repository into your SillyTavern extensions folder:

   SillyTavern/public/scripts/extensions/rpg-companion/

2. Restart SillyTavern

3. Go to Extensions tab → Find RPG Companion → Enable it

4. Open the extension panel (appears on the right side by default)

5. Configure your settings and start roleplaying!

## 🎮 How It Works

Instead of having the AI model generate RPG companion data in its main response, this extension:

1. Lets you roleplay normally without RPG prompts cluttering the conversation
2. After each AI response, automatically sends a separate request to the model
3. Includes only the last few messages (configurable) for context
4. Asks the model to generate ONLY the RPG companion data
5. Displays the formatted data in a dedicated panel

This approach:

- ✅ Keeps your main roleplay clean and focused
- ✅ Reduces token usage in the main conversation
- ✅ Allows the model to focus on roleplay quality
- ✅ Provides a better visual presentation of stats and info

## ⚙️ Settings

### Main Panel Controls

- **Panel Position**: Left or Right side of the chat
- **Theme**: Choose from 6 built-in themes or create custom
- **Enable RPG Companion**: Turn the extension on/off
- **Auto-update after messages**: Automatically refresh RPG data after each message
- **Context Messages**: How many recent messages to include when generating updates (default: 4)

### Display Options

- **Show User Stats**: Display the character stats panel
- **Show Info Box**: Display the scene information panel
- **Show Character Thoughts**: Display the AI character's internal thoughts

### Generation Modes

#### Together Mode

Tracker data is generated within the main AI response and automatically extracted:

Example:
User: walks into the tavern

AI: Full roleplay response

↓ Extension extracts tracker data from response

↓ Displays in sidebar panels

↓ Main chat shows clean roleplay text

Pros:
- Single API call
- Faster response
- Simpler setup

Cons:
- Tracker formatting mixed in AI response
- May affect roleplay quality slightly

#### Separate Mode

Tracker data is generated in a separate API call after the main response:

Example:
User: walks into the tavern

AI: Pure roleplay response - no tracker data

↓ Extension sends separate request with context

↓ AI generates only tracker data

↓ Displays in sidebar panels

↓ Context summary injected into next generation

Pros:
- Clean roleplay responses
- Better roleplay quality
- Contextual summary enhances immersion

Cons:
- Extra API call
- Slightly slower

### Model Selection

- **Use main chat model**: Use the same model as your chat (recommended)
- Custom model selection (coming soon)

## 📝 How to Use

### Quick Start

1. Enable the extension in the Extensions tab
2. Choose your generation mode: Together or Separate
3. Select which panels to display (User Stats, Info Box, Character Thoughts)
4. Start chatting! The tracker updates automatically

### Editing Tracker Data

You can edit most fields by clicking on them:

- **Stats**: Click on percentage values, mood emoji, conditions, or inventory
- **Info Box**: Click on date fields, weather, temperature, time, or location
- **Character Thoughts**: Click on emoji, name, traits, relationship, or thoughts

Note: When editing character thoughts in the floating bubble, the bubble will refresh to maintain proper positioning.

### Swipe Support

The extension fully supports swipes:

- Each swipe stores its own tracker data
- Swiping loads the data for that specific swipe
- New swipe generation uses the committed data from before the swipe
- User edits are preserved across swipes

### Manual Update

If auto-update is disabled, you can click the "Manual Update" button in the settings to refresh the RPG data at any time.

## 🎨 Themes

Choose from 6 beautiful themes:

- **Cyberpunk**: Neon pink and cyan with futuristic vibes
- **Fantasy**: Purple and gold with mystical aesthetics
- **Minimal**: Clean monochrome design
- **Dark**: Deep blacks and subtle accents
- **Light**: Bright and airy interface
- **Custom**: Create your own with custom colors

## 🛠️ Technical Details

### Data Architecture

The extension uses a two-variable system:

- **lastGeneratedData**: Currently displayed tracker data (updates on generation, swipe, edit)
- **committedTrackerData**: Data used for context generation (updates when user sends message)

This separation ensures:
- Edits are displayed immediately
- Context uses the committed state from before edits
- Swipes preserve their own data correctly

### Swipe Detection

The extension intelligently detects swipes:

- MESSAGE_SENT event sets swipe flag to false
- MESSAGE_SWIPED checks if swipe content exists
- Only sets flag true for NEW generations (not navigation)
- Flag resets in onMessageReceived after generation completes

### Context Generation (Separate Mode)

Weather detection uses an emoji array:
🌤️ ☀️ ⛅ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ 🌫️

Parsing uses separate if statements (not else-if) for each Info Box field to ensure all data is captured correctly.

## 🐛 Troubleshooting

### Extension doesn't appear

- Make sure you've restarted SillyTavern after installation
- Check browser console (F12) for errors
- Verify all files are in the correct location

### Stats not updating

- Check that "Auto-update" is enabled
- Try clicking "Manual Update" to test
- Verify your AI backend is responding correctly
- Check browser console for error messages

### Display issues

- Try refreshing the page
- Check if other extensions are conflicting
- Verify CSS is loading correctly

### Thought bubble positioning

- Bubbles use fixed 350px width for consistent positioning
- Bubbles refresh after edits to maintain alignment
- If issues persist, try toggling the Character Thoughts display

## 📜 License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

Copyright (C) 2024 Marysia (marinara_spaghetti)

## 💖 Support

If you enjoy this extension, consider supporting development:

- [Join our Discord community](https://discord.com/invite/KdAkTg94ME)
- [Support on Ko-fi](https://ko-fi.com/marinara_spaghetti)

## 🙏 Credits

- Extension Development: Marysia with assistance from GitHub Copilot
- Immersive HTML concept: Credit to u/melted_walrus
- Info Box prompt inspiration: MidnightSleeper
- Stats Tracker concept: Community feedback

## 🚀 Planned Features

- Support for selecting a different model for RPG updates
- Relationship/Standing system with characters
- Random plot push integration
- Export/import RPG data
- Historical stats tracking
- Custom stat categories
- Integration with character cards

## 💡 Tips

1. **Context Messages**: Start with 4 messages and adjust based on your needs. More messages = better context but slower updates
2. **Performance**: If updates are slow, consider reducing the context depth or using a faster model
3. **Customization**: You can modify the prompts in index.js to add your own stat categories or change the format

## 📋 Compatibility

- Requires SillyTavern 1.11.0 or higher
- Works with all AI backends (OpenAI, Claude, KoboldAI, etc.)
- Mobile-responsive design

---

Made with ❤️ by Marysia
