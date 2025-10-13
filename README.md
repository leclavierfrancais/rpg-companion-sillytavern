# RPG Companion Extension for SillyTavern# RPG Companion Extension for SillyTavern



An immersive RPG extension that tracks character stats, scene information, and character thoughts in a beautiful, customizable UI panel. All automated! Works with any preset. Choose between Together or Separate generation modes for context and generations control.An immersive RPG extension that tracks character stats, scene information, and character thoughts in a beautiful, customizable UI panel. All automated! Works with any preset. Choose between Together or Separate generation modes for context and generations control.



[![Discord](https://img.shields.io/badge/Discord-Join%20Server-7289da)](https://discord.com/invite/KdAkTg94ME)[![Discord](https://img.shields.io/badge/Discord-Join%20Server-7289da)](https://discord.com/invite/KdAkTg94ME)

[![Support](https://img.shields.io/badge/Ko--fi-Support%20Creator-ff5e5b)](https://ko-fi.com/marinara_spaghetti)[![Support](https://img.shields.io/badge/Ko--fi-Support%20Creator-ff5e5b)](https://ko-fi.com/marinara_spaghetti)



## ✨ Features## ✨ Features



### Core Functionality### Core Functionality



- **📊 User Stats Tracker**: Visual progress bars for health, sustenance, energy, hygiene, arousal, mood, and conditions- **📊 User Stats Tracker**: Visual progress bars for health, sustenance, energy, hygiene, arousal, mood, and conditions

- **🌍 Info Box Dashboard**: Beautiful widgets displaying date, weather, temperature, time, and location- **🌍 Info Box Dashboard**: Beautiful widgets displaying date, weather, temperature, time, and location

- **💭 Character Thoughts**: Floating thought bubbles showing AI characters' internal monologue (editable in real-time!)- **💭 Character Thoughts**: Floating thought bubbles showing AI characters' internal monologue (editable in real-time!)

- **🎲 Classic RPG Stats**: STR, DEX, CON, INT, WIS, CHA attributes with dice roll support- **🎲 Classic RPG Stats**: STR, DEX, CON, INT, WIS, CHA attributes with dice roll support

- **📦 Inventory System**: Track items your character is carrying- **📦 Inventory System**: Track items your character is carrying

- **🎨 Multiple Themes**: Cyberpunk, Fantasy, Minimal, Dark, Light, and Custom themes- **🎨 Multiple Themes**: Cyberpunk, Fantasy, Minimal, Dark, Light, and Custom themes

- **✏️ Live Editing**: Edit stats, thoughts, weather, and more directly in the panels- **✏️ Live Editing**: Edit stats, thoughts, weather, and more directly in the panels

- **💾 Per-Swipe Data Storage**: Each swipe preserves its own tracker data- **💾 Per-Swipe Data Storage**: Each swipe preserves its own tracker data



### Smart Features## 📥 Installation



- **🔄 Swipe Detection**: Automatically handles swipes and maintains correct tracker context1. The extension should already be in your `public/scripts/extensions/rpg-companion/` folder

- **📝 Context-Aware**: Weather, stats, and character states naturally influence the narrative2. Restart SillyTavern if it's running

- **🎭 Multiple Characters**: Tracks thoughts and relationships for all present characters3. Go to Extensions > Manage Extensions

- **📍 Thought Bubbles in Chat**: Optional floating thought bubbles positioned next to character avatars4. Enable "RPG Companion"

- **🌈 Customizable Colors**: Create your own theme with custom color schemes5. Reload the page

- **📱 Mobile Responsive**: Works beautifully on all devices

## 🎮 How It Works

## 📥 Installation

Instead of having the AI model generate RPG companion data in its main response, this extension:1. Lets you roleplay normally without RPG prompts cluttering the conversation

1. Download or clone this repository into your SillyTavern extensions folder:

   ```2. After each AI response, automatically sends a separate request to the model

   SillyTavern/public/scripts/extensions/rpg-companion/

   ```#### Separate Mode3. Includes only the last few messages (configurable) for context



2. Restart SillyTavern- Generates tracker data in a **separate API call** after the main response4. Asks the model to generate ONLY the RPG companion data



3. Go to **Extensions** tab → Find **RPG Companion** → Enable it- Main roleplay stays clean without tracker formatting5. Displays the formatted data in a dedicated panel



4. Open the extension panel (appears on the right side by default)- Contextual summary injected for immersive storytelling



5. Configure your settings and start roleplaying!- Best for: Users who want pure roleplay responses and don't mind extra API callsThis approach:



## 🎮 How It Works- ✅ Keeps your main roleplay clean and focused



Instead of having the AI model generate RPG companion data in its main response, this extension:### Smart Features- ✅ Reduces token usage in the main conversation



1. Lets you roleplay normally without RPG prompts cluttering the conversation- **🔄 Swipe Detection**: Automatically handles swipes and maintains correct tracker context- ✅ Allows the model to focus on roleplay quality

2. After each AI response, automatically sends a separate request to the model

3. Includes only the last few messages (configurable) for context- **📝 Context-Aware**: Weather, stats, and character states naturally influence the narrative- ✅ Provides a better visual presentation of stats and info

4. Asks the model to generate ONLY the RPG companion data

5. Displays the formatted data in a dedicated panel- **🎭 Multiple Characters**: Tracks thoughts and relationships for all present characters



This approach:- **📍 Thought Bubbles in Chat**: Optional floating thought bubbles positioned next to character avatars## Settings



- ✅ Keeps your main roleplay clean and focused- **🌈 Customizable Colors**: Create your own theme with custom color schemes

- ✅ Reduces token usage in the main conversation

- ✅ Allows the model to focus on roleplay quality- **📱 Mobile Responsive**: Works beautifully on all devices### Main Controls

- ✅ Provides a better visual presentation of stats and info

- **Enable RPG Companion**: Turn the extension on/off

## ⚙️ Settings

## 📦 Installation- **Auto-update after messages**: Automatically refresh RPG data after each message

### Main Panel Controls

- **Context Messages**: How many recent messages to include when generating updates (default: 4)

- **Panel Position**: Left or Right side of the chat

- **Theme**: Choose from 6 built-in themes or create custom1. Download or clone this repository into your SillyTavern extensions folder:

- **Enable RPG Companion**: Turn the extension on/off

- **Auto-update after messages**: Automatically refresh RPG data after each message   ```### Display Options

- **Context Messages**: How many recent messages to include when generating updates (default: 4)

   SillyTavern/public/scripts/extensions/rpg-companion/- **Show User Stats**: Display the character stats panel

### Display Options

   ```- **Show Info Box**: Display the scene information panel

- **Show User Stats**: Display the character stats panel

- **Show Info Box**: Display the scene information panel- **Show Character Thoughts**: Display the AI character's internal thoughts

- **Show Character Thoughts**: Display the AI character's internal thoughts

2. Restart SillyTavern

### Generation Modes

### Model Selection

#### Together Mode

3. Go to **Extensions** tab → Find **RPG Companion** → Enable it- **Use main chat model**: Use the same model as your chat (recommended)

Tracker data is generated **within the main AI response** and automatically extracted:

- Custom model selection (coming soon)

**Example:**

User: *walks into the tavern*4. Open the extension panel (appears on the right side by default)



AI: [Full roleplay response]## Manual Update



↓ Extension extracts tracker data from response5. Configure your settings and start roleplaying!



↓ Displays in sidebar panelsIf auto-update is disabled, you can click the "Manual Update" button in the settings to refresh the RPG data at any time.



↓ Main chat shows clean roleplay text## 🎮 How to Use



**Pros:**## Planned Features

- Single API call

- Faster response### Quick Start

- Simpler setup

- [ ] Support for selecting a different model for RPG updates

**Cons:**

- Tracker formatting mixed in AI response1. **Enable the extension** in the Extensions tab- [ ] Relationship/Standing system with characters

- May affect roleplay quality slightly

2. **Choose your generation mode**:- [ ] Support for immersive HTML elements

#### Separate Mode

   - **Together**: Tracker data generated with the AI response- [ ] Random plot push integration

Tracker data is generated in a **separate API call** after the main response:

   - **Separate**: Tracker data generated in a separate call (requires auto-update)- [ ] Export/import RPG data

**Example:**

User: *walks into the tavern*3. **Select which panels to display** (User Stats, Info Box, Character Thoughts)- [ ] Historical stats tracking



AI: [Pure roleplay response - no tracker data]4. **Start chatting!** The tracker updates automatically- [ ] Custom stat categories



↓ Extension sends separate request with context- [ ] Integration with character cards



↓ AI generates only tracker data### Generation Modes Explained



↓ Displays in sidebar panels## Tips



↓ Context summary injected into next generation#### Together Mode



**Pros:**```1. **Context Messages**: Start with 4 messages and adjust based on your needs. More messages = better context but slower updates

- Clean roleplay responses

- Better roleplay qualityUser: *walks into the tavern*2. **Performance**: If updates are slow, consider reducing the context depth or using a faster model

- Contextual summary enhances immersion

AI: [Full roleplay response]3. **Customization**: You can modify the prompts in `index.js` to add your own stat categories or change the format

**Cons:**

- Extra API call```

- Slightly slower

↓ Extension extracts tracker data from response## Compatibility

### Model Selection

↓ Displays in sidebar panels

- **Use main chat model**: Use the same model as your chat (recommended)

- Custom model selection (coming soon)↓ Main chat shows clean roleplay text- Requires SillyTavern 1.11.0 or higher



## 📝 How to Use- Works with all AI backends (OpenAI, Claude, KoboldAI, etc.)



### Quick Start#### Separate Mode- Mobile-responsive design



1. **Enable the extension** in the Extensions tab```

2. **Choose your generation mode**: Together or Separate

3. **Select which panels to display** (User Stats, Info Box, Character Thoughts)User: *walks into the tavern*## Credits

4. **Start chatting!** The tracker updates automatically

AI: [Pure roleplay response - no tracker data]

### Editing Tracker Data

```- Stats Tracker: Original concept by user

You can edit most fields by clicking on them:

↓ Extension sends separate request with context- Info Box: Credit to MidnightSleeper for the original prompt

- **Stats**: Click on percentage values, mood emoji, conditions, or inventory

- **Info Box**: Click on date fields, weather, temperature, time, or location↓ AI generates only tracker data- Immersive HTML: Credit to u/melted_walrus for the original concept

- **Character Thoughts**: Click on emoji, name, traits, relationship, or thoughts

↓ Displays in sidebar panels- Extension Development: Marysia with assistance from GitHub Copilot

**Note**: When editing character thoughts in the floating bubble, the bubble will refresh to maintain proper positioning.

↓ Context summary injected into next generation

### Swipe Support

## Troubleshooting

The extension fully supports swipes:

### Editing Tracker Data

- Each swipe stores its own tracker data

- Swiping loads the data for that specific swipe### Extension doesn't appear

- New swipe generation uses the committed data from before the swipe

- User edits are preserved across swipesYou can edit most fields by clicking on them:- Make sure you've restarted SillyTavern after installation



### Manual Update- **Stats**: Click on percentage values, mood emoji, conditions, or inventory- Check browser console (F12) for errors



If auto-update is disabled, you can click the "Manual Update" button in the settings to refresh the RPG data at any time.- **Info Box**: Click on date fields, weather, temperature, time, or location- Verify all files are in the correct location



## 🎨 Themes- **Character Thoughts**: Click on emoji, name, traits, relationship, or thoughts



Choose from 6 beautiful themes:### Stats not updating



- **Cyberpunk**: Neon pink and cyan with futuristic vibes**Note**: When editing character thoughts in the floating bubble, the bubble will refresh to maintain proper positioning.- Check that "Auto-update" is enabled

- **Fantasy**: Purple and gold with mystical aesthetics

- **Minimal**: Clean monochrome design- Try clicking "Manual Update" to test

- **Dark**: Deep blacks and subtle accents

- **Light**: Bright and airy interface### Swipe Support- Verify your AI backend is responding correctly

- **Custom**: Create your own with custom colors

- Check browser console for error messages

## 🛠️ Technical Details

The extension fully supports swipes:

### Data Architecture

- Each swipe stores its own tracker data### Display issues

The extension uses a two-variable system:

- Swiping loads the data for that specific swipe- Try refreshing the page

- **lastGeneratedData**: Currently displayed tracker data (updates on generation, swipe, edit)

- **committedTrackerData**: Data used for context generation (updates when user sends message)- New swipe generation uses the committed data from before the swipe- Check if other extensions are conflicting



This separation ensures:- User edits are preserved across swipes- Verify CSS is loading correctly

- Edits are displayed immediately

- Context uses the committed state from before edits

- Swipes preserve their own data correctly

## ⚙️ Settings## License

### Swipe Detection



The extension intelligently detects swipes:

### Main Panel ControlsMIT License - Feel free to modify and share!

- MESSAGE_SENT event sets swipe flag to false

- MESSAGE_SWIPED checks if swipe content exists- **Panel Position**: Left or Right side of the chat

- Only sets flag true for NEW generations (not navigation)

- Flag resets in onMessageReceived after generation completes- **Theme**: Choose from 6 built-in themes or create custom## Support



### Context Generation (Separate Mode)- **Generation Mode**: Together or Separate



Weather detection uses an emoji array:- **Auto-update**: Toggle automatic updates (required for Separate mode)For issues, suggestions, or contributions, please visit the SillyTavern GitHub repository.

🌤️ ☀️ ⛅ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ 🌫️

- **Update Depth**: Number of messages to include as context (1-10)

Parsing uses separate if statements (not else-if) for each Info Box field to ensure all data is captured correctly.

### Display Toggles

## 🐛 Troubleshooting- **Show User Stats**: Character stats panel

- **Show Info Box**: Scene information dashboard

### Extension doesn't appear- **Show Character Thoughts**: Character thoughts panel

- **Show Thoughts in Chat**: Floating thought bubbles next to avatars

- Make sure you've restarted SillyTavern after installation

- Check browser console (F12) for errors### Advanced Options

- Verify all files are in the correct location- **Enable Animations**: Smooth transitions for panel updates

- **Enable HTML Prompt**: Allow creative HTML/CSS/JS elements in responses

### Stats not updating- **Classic Stats**: STR, DEX, CON, INT, WIS, CHA attributes

- **Dice Rolling**: Roll checks against your classic stats

- Check that "Auto-update" is enabled

- Try clicking "Manual Update" to test## 🎨 Themes

- Verify your AI backend is responding correctly

- Check browser console for error messagesBuilt-in themes:

- **Cyberpunk**: Neon colors and futuristic vibes

### Display issues- **Fantasy**: Warm, medieval aesthetic

- **Minimal**: Clean and simple

- Try refreshing the page- **Dark**: Low-light, high contrast

- Check if other extensions are conflicting- **Light**: Bright and airy

- Verify CSS is loading correctly- **Custom**: Define your own colors!



### Thought bubble positioning## 🔧 Technical Details



- Bubbles use fixed 350px width for consistent positioning### Data Flow (Together Mode)

- Bubbles refresh after edits to maintain alignment1. User sends message → flag set to `false` (new message)

- If issues persist, try toggling the Character Thoughts display2. Extension injects tracker instructions into prompt

3. AI generates response with tracker data in code blocks

## 📜 License4. Extension extracts and parses tracker data

5. Updates `lastGeneratedData` (displayed)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.6. Stores per-swipe data in message.extra

7. On next user message, commits data to `committedTrackerData` (used for generation)

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

### Data Flow (Separate Mode)

Copyright (C) 2024 Marysia (marinara_spaghetti)1. User sends message → flag set to `false`

2. Extension injects contextual summary into prompt

## 💖 Support3. AI generates pure roleplay response

4. Extension sends separate request for tracker update

If you enjoy this extension, consider supporting development:5. AI generates only tracker data

6. Updates and stores data same as Together mode

- [Join our Discord community](https://discord.com/invite/KdAkTg94ME)

- [Support on Ko-fi](https://ko-fi.com/marinara_spaghetti)### Swipe Detection

- Uses `MESSAGE_SENT` and `MESSAGE_SWIPED` events

## 🙏 Credits- Distinguishes between new swipe generation and navigation

- Maintains separate committed data and displayed data

- Extension Development: Marysia with assistance from GitHub Copilot- Ensures consistency across swipe operations

- Immersive HTML concept: Credit to u/melted_walrus

- Info Box prompt inspiration: MidnightSleeper## 🎯 Prompting Tips

- Stats Tracker concept: Community feedback

### For Best Results (Together Mode)

## 🚀 Planned FeaturesThe extension provides clear instructions to the AI. The model will:

- Generate tracker data in code blocks

- [ ] Support for selecting a different model for RPG updates- Update only changed values

- [ ] Relationship/Standing system with characters- Maintain consistency across messages

- [ ] Random plot push integration

- [ ] Export/import RPG data### For Best Results (Separate Mode)

- [ ] Historical stats tracking- Use 3-5 message depth for good context

- [ ] Custom stat categories- The AI receives a clean context summary

- [ ] Integration with character cards- Tracker updates focus only on changes



## 💡 Tips### HTML Elements (Optional)

Enable "HTML Prompt" to allow creative visual elements:

1. **Context Messages**: Start with 4 messages and adjust based on your needs. More messages = better context but slower updates- Computer screens, signs, posters, books

2. **Performance**: If updates are slow, consider reducing the context depth or using a faster model- 3D effects, animations, interactive elements

3. **Customization**: You can modify the prompts in `index.js` to add your own stat categories or change the format- Styled thematically to match your setting

- No external dependencies required

## 📋 Compatibility

## 🤝 Credits

- Requires SillyTavern 1.11.0 or higher

- Works with all AI backends (OpenAI, Claude, KoboldAI, etc.)- **Extension Development**: Marysia with assistance from GitHub Copilot

- Mobile-responsive design- **Immersive HTML Concept**: u/melted_walrus

- **Community Feedback**: SillyTavern Discord community

---

## 📝 License

Made with ❤️ by Marysia

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
