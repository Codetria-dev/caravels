# Caravels

Modern frontend project built with Vite + React + Tailwind CSS.

## Stack

- **React 19** - UI library
- **Vite 8** - Build tool
- **Tailwind CSS 4** - Styling

## Project Structure

```
src/
├── components/     # Reusable UI components
├── sections/       # Page sections
├── hooks/          # Custom React hooks
├── services/       # API calls and external services
├── App.jsx         # Main app component
└── main.jsx        # Entry point
```

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

- Single page application (no routing)
- Functional components only
- Tailwind CSS for styling
- Clean and scalable architecture

## Anthropic File Upload

The frontend should not call Anthropic directly because the API key must stay server-side.

Install the Python dependency:

```bash
pip install anthropic
```

Set `ANTHROPIC_API_KEY` in your shell, then run:

```bash
python scripts/upload_anthropic_file.py /path/to/document.pdf
```
