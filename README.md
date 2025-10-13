# RPG Companion Extension for SillyTavern# RPG Companion Extension for SillyTavern

An immersive RPG extension that tracks character stats, scene information, and character thoughts in a beautiful, customizable UI panel. All automated! Works with any preset. Choose between Together or Separate generation modes for context and generations control.

[![Discord](https://img.shields.io/badge/Discord-Join%20Server-7289da)](https://discord.com/invite/KdAkTg94ME)## Features

[![Support](https://img.shields.io/badge/Ko--fi-Support%20Creator-ff5e5b)](https://ko-fi.com/marinara_spaghetti)

- **User Stats Tracker**: Displays health, sustenance, energy, hygiene, arousal, mood, and conditions with visual progress bars

## ✨ Features- **Info Box**: Shows scene information including date, time, location, weather, and present characters

- **Character Thoughts**: Reveals the AI character's internal monologue

### Core Functionality- **Automatic Updates**: Automatically updates RPG data after each message exchange

- **📊 User Stats Tracker**: Visual progress bars for health, sustenance, energy, hygiene, arousal, mood, and conditions- **Customizable**: Control what information is displayed and when

- **🌍 Info Box Dashboard**: Beautiful widgets displaying date, weather, temperature, time, and location- **Non-Intrusive**: Keeps RPG mechanics separate from the main roleplay, reducing prompt clutter

- **💭 Character Thoughts**: Floating thought bubbles showing AI characters' internal monologue (editable in real-time!)

- **🎲 Classic RPG Stats**: STR, DEX, CON, INT, WIS, CHA attributes with dice roll support## Installation

- **📦 Inventory System**: Track items your character is carrying

- **🎨 Multiple Themes**: Cyberpunk, Fantasy, Minimal, Dark, Light, and Custom themes1. The extension should already be in your `public/scripts/extensions/rpg-companion/` folder

- **✏️ Live Editing**: Edit stats, thoughts, weather, and more directly in the panels2. Restart SillyTavern if it's running

- **💾 Per-Swipe Data Storage**: Each swipe preserves its own tracker data3. Go to Extensions > Manage Extensions

4. Enable "RPG Companion"
   
5. Reload the page

### Generation Modes



#### Together Mode## How It Works

- Generates tracker data **within the main AI response**

- Cleaner, single-generation approachInstead of having the AI model generate RPG companion data in its main response, this extension:

- Data automatically extracted and formatted in the sidebar

- Best for: Users who want seamless integration without extra API calls1. Lets you roleplay normally without RPG prompts cluttering the conversation

2. After each AI response, automatically sends a separate request to the model

#### Separate Mode3. Includes only the last few messages (configurable) for context

- Generates tracker data in a **separate API call** after the main response4. Asks the model to generate ONLY the RPG companion data

- Main roleplay stays clean without tracker formatting5. Displays the formatted data in a dedicated panel

- Contextual summary injected for immersive storytelling

- Best for: Users who want pure roleplay responses and don't mind extra API callsThis approach:

- ✅ Keeps your main roleplay clean and focused

### Smart Features- ✅ Reduces token usage in the main conversation

- **🔄 Swipe Detection**: Automatically handles swipes and maintains correct tracker context- ✅ Allows the model to focus on roleplay quality

- **📝 Context-Aware**: Weather, stats, and character states naturally influence the narrative- ✅ Provides a better visual presentation of stats and info

- **🎭 Multiple Characters**: Tracks thoughts and relationships for all present characters

- **📍 Thought Bubbles in Chat**: Optional floating thought bubbles positioned next to character avatars## Settings

- **🌈 Customizable Colors**: Create your own theme with custom color schemes

- **📱 Mobile Responsive**: Works beautifully on all devices### Main Controls

- **Enable RPG Companion**: Turn the extension on/off

## 📦 Installation- **Auto-update after messages**: Automatically refresh RPG data after each message

- **Context Messages**: How many recent messages to include when generating updates (default: 4)

1. Download or clone this repository into your SillyTavern extensions folder:

   ```### Display Options

   SillyTavern/public/scripts/extensions/rpg-companion/- **Show User Stats**: Display the character stats panel

   ```- **Show Info Box**: Display the scene information panel

- **Show Character Thoughts**: Display the AI character's internal thoughts

2. Restart SillyTavern

### Model Selection

3. Go to **Extensions** tab → Find **RPG Companion** → Enable it- **Use main chat model**: Use the same model as your chat (recommended)

- Custom model selection (coming soon)

4. Open the extension panel (appears on the right side by default)

## Manual Update

5. Configure your settings and start roleplaying!

If auto-update is disabled, you can click the "Manual Update" button in the settings to refresh the RPG data at any time.

## 🎮 How to Use

## Planned Features

### Quick Start

- [ ] Support for selecting a different model for RPG updates

1. **Enable the extension** in the Extensions tab- [ ] Relationship/Standing system with characters

2. **Choose your generation mode**:- [ ] Support for immersive HTML elements

   - **Together**: Tracker data generated with the AI response- [ ] Random plot push integration

   - **Separate**: Tracker data generated in a separate call (requires auto-update)- [ ] Export/import RPG data

3. **Select which panels to display** (User Stats, Info Box, Character Thoughts)- [ ] Historical stats tracking

4. **Start chatting!** The tracker updates automatically- [ ] Custom stat categories

- [ ] Integration with character cards

### Generation Modes Explained

## Tips

#### Together Mode

```1. **Context Messages**: Start with 4 messages and adjust based on your needs. More messages = better context but slower updates

User: *walks into the tavern*2. **Performance**: If updates are slow, consider reducing the context depth or using a faster model

AI: [Full roleplay response]3. **Customization**: You can modify the prompts in `index.js` to add your own stat categories or change the format

```

↓ Extension extracts tracker data from response## Compatibility

↓ Displays in sidebar panels

↓ Main chat shows clean roleplay text- Requires SillyTavern 1.11.0 or higher

- Works with all AI backends (OpenAI, Claude, KoboldAI, etc.)

#### Separate Mode- Mobile-responsive design

```

User: *walks into the tavern*## Credits

AI: [Pure roleplay response - no tracker data]

```- Stats Tracker: Original concept by user

↓ Extension sends separate request with context- Info Box: Credit to MidnightSleeper for the original prompt

↓ AI generates only tracker data- Immersive HTML: Credit to u/melted_walrus for the original concept

↓ Displays in sidebar panels- Extension Development: Marysia with assistance from GitHub Copilot

↓ Context summary injected into next generation

## Troubleshooting

### Editing Tracker Data

### Extension doesn't appear

You can edit most fields by clicking on them:- Make sure you've restarted SillyTavern after installation

- **Stats**: Click on percentage values, mood emoji, conditions, or inventory- Check browser console (F12) for errors

- **Info Box**: Click on date fields, weather, temperature, time, or location- Verify all files are in the correct location

- **Character Thoughts**: Click on emoji, name, traits, relationship, or thoughts

### Stats not updating

**Note**: When editing character thoughts in the floating bubble, the bubble will refresh to maintain proper positioning.- Check that "Auto-update" is enabled

- Try clicking "Manual Update" to test

### Swipe Support- Verify your AI backend is responding correctly

- Check browser console for error messages

The extension fully supports swipes:

- Each swipe stores its own tracker data### Display issues

- Swiping loads the data for that specific swipe- Try refreshing the page

- New swipe generation uses the committed data from before the swipe- Check if other extensions are conflicting

- User edits are preserved across swipes- Verify CSS is loading correctly



## ⚙️ Settings## License



### Main Panel ControlsMIT License - Feel free to modify and share!

- **Panel Position**: Left or Right side of the chat

- **Theme**: Choose from 6 built-in themes or create custom## Support

- **Generation Mode**: Together or Separate

- **Auto-update**: Toggle automatic updates (required for Separate mode)For issues, suggestions, or contributions, please visit the SillyTavern GitHub repository.

- **Update Depth**: Number of messages to include as context (1-10)

### Display Toggles
- **Show User Stats**: Character stats panel
- **Show Info Box**: Scene information dashboard
- **Show Character Thoughts**: Character thoughts panel
- **Show Thoughts in Chat**: Floating thought bubbles next to avatars

### Advanced Options
- **Enable Animations**: Smooth transitions for panel updates
- **Enable HTML Prompt**: Allow creative HTML/CSS/JS elements in responses
- **Classic Stats**: STR, DEX, CON, INT, WIS, CHA attributes
- **Dice Rolling**: Roll checks against your classic stats

## 🎨 Themes

Built-in themes:
- **Cyberpunk**: Neon colors and futuristic vibes
- **Fantasy**: Warm, medieval aesthetic
- **Minimal**: Clean and simple
- **Dark**: Low-light, high contrast
- **Light**: Bright and airy
- **Custom**: Define your own colors!

## 🔧 Technical Details

### Data Flow (Together Mode)
1. User sends message → flag set to `false` (new message)
2. Extension injects tracker instructions into prompt
3. AI generates response with tracker data in code blocks
4. Extension extracts and parses tracker data
5. Updates `lastGeneratedData` (displayed)
6. Stores per-swipe data in message.extra
7. On next user message, commits data to `committedTrackerData` (used for generation)

### Data Flow (Separate Mode)
1. User sends message → flag set to `false`
2. Extension injects contextual summary into prompt
3. AI generates pure roleplay response
4. Extension sends separate request for tracker update
5. AI generates only tracker data
6. Updates and stores data same as Together mode

### Swipe Detection
- Uses `MESSAGE_SENT` and `MESSAGE_SWIPED` events
- Distinguishes between new swipe generation and navigation
- Maintains separate committed data and displayed data
- Ensures consistency across swipe operations

## 🎯 Prompting Tips

### For Best Results (Together Mode)
The extension provides clear instructions to the AI. The model will:
- Generate tracker data in code blocks
- Update only changed values
- Maintain consistency across messages

### For Best Results (Separate Mode)
- Use 3-5 message depth for good context
- The AI receives a clean context summary
- Tracker updates focus only on changes

### HTML Elements (Optional)
Enable "HTML Prompt" to allow creative visual elements:
- Computer screens, signs, posters, books
- 3D effects, animations, interactive elements
- Styled thematically to match your setting
- No external dependencies required

## 🤝 Credits

- **Extension Development**: Marysia with assistance from GitHub Copilot
- **Immersive HTML Concept**: u/melted_walrus
- **Community Feedback**: SillyTavern Discord community

## 📝 License

```
RPG Companion Extension for SillyTavern
Copyright (C) 2024 Marysia (marinara_spaghetti)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
```

See [LICENSE](LICENSE) file for full license text.

## 💬 Support & Community

- **Discord**: [Join our server](https://discord.com/invite/KdAkTg94ME)
- **Support the Creator**: [Ko-fi](https://ko-fi.com/marinara_spaghetti)
- **Issues**: Report bugs via GitHub issues
- **Contributions**: Pull requests welcome!

## 🐛 Troubleshooting

### Extension doesn't appear
- Restart SillyTavern after installation
- Check browser console (F12) for errors
- Verify all files are in `/public/scripts/extensions/rpg-companion/`

### Tracker data not updating
- **Together Mode**: Check that instructions are being included in prompts
- **Separate Mode**: Ensure auto-update is enabled
- Verify your AI model is responding correctly
- Check browser console for errors

### Thought bubbles not appearing
- Enable "Show Thoughts in Chat" toggle
- Verify character thoughts data exists
- Check that panel position doesn't conflict with chat layout

### Edits not saving
- Ensure you click away from the field after editing (blur event)
- Check browser console for errors
- Verify chat data is saving correctly

### Swipe data issues
- Each swipe stores its own data independently
- If data seems wrong, try regenerating that swipe
- Check that committedTrackerData is properly initialized

## 🚀 Future Ideas

- Custom stat categories
- Historical stats tracking/graphs
- Export/import functionality
- Advanced relationship systems
- Quest/objective tracking
- Achievement system
- Integration with character card metadata

---

**Enjoy your immersive RPG experience!** 🎲✨
