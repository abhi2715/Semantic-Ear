# Contributing to Semantic Ear

First off, thank you for considering contributing to Semantic Ear! 🎉

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected to see
- **Include screenshots or GIFs** if applicable
- **Mention your environment** (OS, browser, Node version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List examples** of how the feature would be used

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** following our code style
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Commit with clear messages** following conventional commits
6. **Push to your fork** and submit a pull request

#### Pull Request Guidelines

- **Keep PRs focused** - One feature/fix per PR
- **Write clear commit messages** - Use conventional commits format
- **Update documentation** - If you change behavior, update the README
- **Add tests** - If you add functionality, add tests
- **Follow the code style** - Match the existing code style

## Development Setup

1. **Clone your fork**
```bash
git clone https://github.com/your-username/semantic-ear.git
cd semantic-ear
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Make your changes** and test locally

## Code Style

- Use **React functional components** and hooks
- Follow **ES6+ syntax**
- Use **Tailwind CSS** for styling
- Keep components **small and focused**
- Add **JSDoc comments** for complex functions
- Use **meaningful variable names**

### Example Code Style

```jsx
// Good
const MemoryCard = ({ memory, onDelete }) => {
  const handleDelete = () => {
    onDelete(memory.id);
  };

  return (
    <div className="bg-white rounded-lg p-4">
      {/* ... */}
    </div>
  );
};

// Bad
const card = (props) => {
  return <div style={{background: 'white'}}>{/* ... */}</div>
}
```

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi colons, etc)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding tests
- **chore**: Maintenance tasks

### Examples
```
feat(memory): add export to CSV functionality
fix(search): resolve case-sensitive search bug
docs(readme): update installation instructions
style(cursor): improve custom cursor animations
```

## Project Structure

```
semantic-ear/
├── src/
│   ├── App.jsx          # Main component with all functionality
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── public/
│   └── index.html       # HTML template
└── ...config files
```

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Code runs without errors
- [ ] All animations work smoothly
- [ ] Responsive design works on mobile
- [ ] Custom cursor functions correctly
- [ ] Memory CRUD operations work
- [ ] Search functionality works
- [ ] Tab navigation works
- [ ] No console errors or warnings

## Need Help?

- Join our [Discord community](#) (if available)
- Check the [documentation](README.md)
- Open an [issue](https://github.com/yourusername/semantic-ear/issues)

## Recognition

Contributors will be recognized in our README.md! 🌟

---

Thank you for contributing to Semantic Ear! 💜
