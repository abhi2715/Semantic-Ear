# 🚀 Quick Start Guide

Get Semantic Ear up and running in 5 minutes!

## Prerequisites

Make sure you have these installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/semantic-ear.git
cd semantic-ear
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using yarn:
```bash
yarn install
```

### 3. Start Development Server

Using npm:
```bash
npm run dev
```

Or using yarn:
```bash
yarn dev
```

### 4. Open in Browser

Navigate to: **http://localhost:5173**

You should see the Semantic Ear hero section! 🎉

## First Steps

### Try the Voice Listening Feature
1. Click the **microphone button** on the hero section
2. Watch the animated waveform respond to simulated voice activity
3. Let it auto-save after 2 seconds, or click **"Stop & Save Memory"**

### Explore Your Memories
Switch between tabs:
- **🧠 Recent Memories** - See all your saved memories in a grid
- **⚡ Smart Insights** - View analytics with animated counters
- **📅 Memory Timeline** - Browse chronological timeline view

### Search Memories
Use the search bar to find specific memories:
```
Try: "biryani" or "meeting"
```

### Delete Memories
Hover over any memory card to reveal the delete (×) button.

## Build for Production

When you're ready to deploy:

```bash
npm run build
# or
yarn build
```

This creates an optimized production build in the `dist` folder.

## Preview Production Build

```bash
npm run preview
# or
yarn preview
```

## Common Issues

### Port Already in Use
If port 5173 is already in use, Vite will automatically try the next available port.

### Module Not Found
Make sure you ran `npm install` or `yarn install` first.

### Blank Screen
1. Check browser console for errors
2. Make sure all dependencies installed correctly
3. Try clearing cache and restarting dev server

## Next Steps

- Read the full [README](README.md) for detailed documentation
- Check out [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
- Customize colors and fonts in `src/App.jsx`
- Add your own mock memories in the `MOCK_MEMORIES` array

## Need Help?

- 📖 Read the [documentation](README.md)
- 🐛 [Report bugs](https://github.com/yourusername/semantic-ear/issues)
- 💬 Join our community (Discord/Slack link if available)

---

**Happy coding! 💜**
