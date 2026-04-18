# MoMo - Memory Leak Detector

AI-powered debugging assistant that detects and explains memory leaks in C, C++, and Python code.

## Features

- **Multi-language Support**: Detect memory leaks in C, C++, and Python
- **Real-time Analysis**: Paste your code and get instant feedback
- **Detailed Explanations**: Understand why each leak occurs and how to fix it
- **Interactive UI**: Clean, terminal-inspired interface
- **Mock Mode**: Test the UI without a backend server

## Tech Stack

- **Frontend**: React 18 with modern hooks
- **Styling**: Custom CSS with dark terminal theme
- **Backend**: REST API (separate repository)
- **Languages Supported**: C, C++, Python

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Backend server running on port 8000 (optional, can use mock mode)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd momo

# Install dependencies
npm install

# Start the development server
npm start
```

The app will open at `http://localhost:3001`

## Usage

1. **Select Language**: Choose C, C++, or Python from the dropdown
2. **Paste Code**: Enter your code in the editor
3. **Toggle Mock Mode**: Use mock responses or connect to your backend API
4. **Analyze**: Click the ⚡ Analyze button to detect memory leaks
5. **Review Results**: See detailed explanations and suggested fixes

## API Integration

When mock mode is disabled, the frontend connects to a backend API at `http://localhost:8000/analyze`

### Request Format
```json
{
  "code": "your code here",
  "language": "c" | "python" | "cpp"
}
```

### Response Format
```json
{
  "leaks": [
    {
      "line": 8,
      "type": "malloc without free",
      "code_snippet": "char *msg = malloc(64);",
      "language": "c",
      "explanation": "Detailed explanation...",
      "fix": "Suggested fix code"
    }
  ],
  "explanation": "Overall summary"
}
```

## Project Structure

```
momo/
├── public/
│   └── index.html          # HTML entry point
├── src/
│   ├── App.js              # Main React component
│   ├── App.css             # Styles
│   └── index.js            # React app entry
├── app/
│   └── app.py              # Streamlit demo (optional)
├── test1.cpp, test2.cpp    # Sample C++ files with leaks
├── package.json            # Dependencies and scripts
└── README.md
```

## Development

```bash
# Run in development mode
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

See LICENSE file for details.
