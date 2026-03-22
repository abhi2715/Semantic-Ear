# 📁 Repository Structure

Complete file structure of the Semantic Ear project.

```
semantic-ear/
│
├── .vscode/
│   └── extensions.json          # Recommended VS Code extensions
│
├── src/
│   ├── App.jsx                  # Main application component (967 lines)
│   ├── main.jsx                 # React entry point
│   └── index.css                # Global styles with Tailwind directives
│
├── public/
│   └── (static assets)          # Add images, icons, etc. here
│
├── .eslintrc.cjs               # ESLint configuration
├── .gitignore                  # Git ignore rules
├── CHANGELOG.md                # Version history and changes
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # MIT License
├── package.json                # Dependencies and scripts
├── postcss.config.js           # PostCSS configuration
├── QUICKSTART.md               # Quick start guide
├── README.md                   # Main documentation
├── tailwind.config.js          # Tailwind CSS configuration
├── vite.config.js              # Vite bundler configuration
└── index.html                  # HTML template

```

## File Descriptions

### Root Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Project metadata, dependencies, and npm scripts |
| `vite.config.js` | Vite build tool configuration |
| `tailwind.config.js` | Tailwind CSS customization (colors, fonts, etc.) |
| `postcss.config.js` | PostCSS configuration for Tailwind |
| `.eslintrc.cjs` | Code linting rules |
| `.gitignore` | Files to exclude from version control |
| `index.html` | HTML entry point with meta tags |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation with features, installation, usage |
| `QUICKSTART.md` | Quick start guide for new users |
| `CONTRIBUTING.md` | Guidelines for contributors |
| `CHANGELOG.md` | Version history and release notes |
| `LICENSE` | MIT License terms |
| `STRUCTURE.md` | This file - repository structure documentation |

### Source Files (`src/`)

| File | Purpose | Lines |
|------|---------|-------|
| `App.jsx` | Main React component with all functionality | ~967 |
| `main.jsx` | React app entry point and root rendering | ~7 |
| `index.css` | Global CSS with Tailwind directives | ~15 |

## Component Breakdown (App.jsx)

The main `App.jsx` file contains:

### Components (Lines 1-760)
- `CustomCursor` - Custom cursor with trailing effect
- `FloatingBlobs` - Animated background blobs
- `Hero` - Landing section with mic button
- `VoiceInput` - Listening modal with waveform
- `MemoryCard` - Individual memory display card
- `SearchBar` - Semantic search interface
- `Timeline` - Vertical timeline view
- `AnimatedCounter` - Counter animation component
- `InsightsPanel` - Analytics dashboard

### Main App Component (Lines 761-967)
- State management
- Event handlers
- Tab navigation
- Content rendering

## Key Dependencies

### Production Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "framer-motion": "^10.16.0"
}
```

### Development Dependencies
- Vite - Build tool
- Tailwind CSS - Styling
- ESLint - Code linting
- Autoprefixer - CSS vendor prefixes

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server on port 5173 |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Configuration Details

### Tailwind CSS
- Custom pastel color palette
- Custom font families (Plus Jakarta Sans, DM Sans)
- Extended backdrop blur utilities

### Vite
- React plugin enabled
- Port 5173 (auto-opens browser)
- Source maps enabled in production

### ESLint
- React recommended rules
- React hooks rules
- PropTypes disabled (using TypeScript types if needed)

## Adding New Files

### Adding a Component
```bash
# Create in src/components/
src/components/NewComponent.jsx
```

### Adding Static Assets
```bash
# Add to public/
public/images/logo.png
public/icons/favicon.ico
```

### Adding Tests (Future)
```bash
# Create test files next to components
src/App.test.jsx
```

## Build Output

After running `npm run build`:
```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── index.html
```

## Best Practices

1. **Keep App.jsx organized** - Consider splitting into smaller components if it grows beyond 1000 lines
2. **Use Tailwind utilities** - Avoid inline styles, use Tailwind classes
3. **Follow component structure** - Props → State → Effects → Handlers → Render
4. **Document new features** - Update CHANGELOG.md for changes
5. **Test before committing** - Run `npm run dev` and check functionality

---

**Last Updated:** 2024-01-15
