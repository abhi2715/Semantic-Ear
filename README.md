# 🎧 Semantic Ear

<div align="center">

![Semantic Ear Logo](https://img.shields.io/badge/Semantic-Ear-FF69B4?style=for-the-badge&logo=react&logoColor=white)

**Your AI that listens, remembers, and understands**

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react&logoColor=white)](https://reactjs.org/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-10.16.0-0055FF?style=flat&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.0-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat)](LICENSE)

[Demo](#-demo) • [Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Contributing](#-contributing)

</div>

---

## 📖 About

Semantic Ear is a stunning, highly interactive UI prototype that simulates an AI-powered memory system. It demonstrates how an AI could continuously listen to users, intelligently store memories, and retrieve them semantically.

This is a **frontend-first prototype** with gorgeous glassmorphism design, smooth animations, and delightful micro-interactions—perfect for showcasing modern AI UX concepts.

## ✨ Features

### 🎙️ **Voice Listening**
- **Continuous listening** with real-time voice activity detection
- Live waveform visualization responding to voice input
- Auto-save on 2 seconds of silence
- Manual stop & save option
- Duration timer tracking conversation length

### 🧠 **Smart Memory System**
- Automatic tagging and categorization
- Timestamp tracking for all memories
- Delete functionality with smooth animations
- Persistent storage simulation

### 🔍 **Semantic Search**
- Intelligent keyword matching
- Tag-based filtering
- Instant results with animated presentation
- Best match highlighting

### 📊 **Analytics Dashboard**
- **Animated counters** that count from 0 to target value on scroll
- Real-time insights (Food mentions, Total memories, Active days)
- Category analysis and trends
- Beautiful stat cards with hover effects

### 🎨 **Premium Design**
- **Custom cursor** with trailing effect and glow
- Glassmorphism cards with backdrop blur
- Pastel gradient color scheme (pink, lavender, blue)
- Smooth shadows and rounded corners
- Floating animated background blobs
- Scroll-triggered animations
- Tab-based navigation with smooth transitions

### 📱 **Responsive**
- Fully responsive design
- Mobile-optimized layouts
- Touch-friendly interactions

## 🎬 Demo

<!-- Add demo GIF or video here -->
```
🎥 Demo coming soon!
```

## 🚀 Installation

### Prerequisites
- Node.js 16.x or higher
- npm or yarn

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/semantic-ear.git
cd semantic-ear
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Start development server**
```bash
npm run dev
# or
yarn dev
```

4. **Open your browser**
```
Navigate to http://localhost:5173
```

## 📦 Tech Stack

- **React 18.2.0** - UI framework
- **Framer Motion 10.16.0** - Animations and transitions
- **Tailwind CSS 3.3.0** - Utility-first CSS
- **Vite** - Build tool and dev server

### Key Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "framer-motion": "^10.16.0"
}
```

## 💻 Usage

### Basic Usage

1. **Click the microphone button** on the hero section to start listening
2. The app will simulate voice detection with animated waveforms
3. **Stop talking for 2 seconds** to auto-save, or click "Stop & Save Memory"
4. Browse your memories using the **tab navigation**:
   - 🧠 **Recent Memories** - Grid view of all memories
   - ⚡ **Smart Insights** - Analytics with animated counters
   - 📅 **Memory Timeline** - Chronological vertical timeline

### Search Memories
Use the search bar to find memories by keywords or tags:
```
Example: "biryani" → Shows all food-related memories
```

### Delete Memories
Hover over any memory card to reveal the delete button (×) in the top-right corner.

## 🏗️ Project Structure

```
semantic-ear/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx                 # Main application component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── LICENSE
```

## 🎨 Design Philosophy

Semantic Ear follows these design principles:

- **Soft & Premium** - Pastel colors, subtle gradients, generous blur effects
- **Delightful Interactions** - Every click, hover, and scroll triggers smooth animations
- **Glassmorphism** - Translucent cards with backdrop blur for depth
- **Custom Cursors** - Enhanced pointer with glow and trailing effects
- **Scroll Animations** - Elements animate into view progressively
- **Number Animations** - Counters count from 0 to final value on scroll

## 🛠️ Customization

### Colors
Edit the gradient colors in `App.jsx`:
```jsx
// Background gradient
bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50

// Button gradients
from-pink-400 to-purple-400
```

### Fonts
Currently using:
- **Plus Jakarta Sans** - Display text
- **DM Sans** - Body text

Change fonts in the `<style>` tag in `App.jsx`.

### Mock Data
Edit `MOCK_MEMORIES` array to customize sample memories.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Roadmap

- [ ] Real backend integration with API
- [ ] Actual speech recognition (Web Speech API)
- [ ] Export memories to JSON/CSV
- [ ] Memory categories customization
- [ ] Dark mode toggle
- [ ] Voice notes playback
- [ ] Chrome extension version
- [ ] Mobile app (React Native)

## 💡 Inspiration

This project was inspired by:
- Modern AI assistants (ChatGPT, Claude)
- Memory-augmented AI concepts
- Glassmorphism design trend
- Framer Motion animation capabilities

## 🙏 Acknowledgments

- [Framer Motion](https://www.framer.com/motion/) - For amazing animation primitives
- [Tailwind CSS](https://tailwindcss.com/) - For rapid UI development
- [React](https://reactjs.org/) - For the component architecture
- [Google Fonts](https://fonts.google.com/) - For beautiful typography

## 📧 Contact

Your Name - [@yourhandle](https://twitter.com/yourhandle)

Project Link: [https://github.com/yourusername/semantic-ear](https://github.com/yourusername/semantic-ear)

---

<div align="center">

**Made with 💜 by the Semantic Ear Team**

⭐ Star this repo if you found it helpful!

</div>
