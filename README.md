# SCORM Content Reader

A modern Next.js TypeScript application for loading, parsing, and displaying SCORM (Sharable Content Object Reference Model) packages from URLs. This application provides a complete SCORM player with support for both SCORM 1.2 and SCORM 2004 standards.

## Features

- **SCORM Standards Support**: Full implementation of SCORM 1.2 and SCORM 2004 APIs
- **URL-based Loading**: Load SCORM packages directly from URLs with automatic unzipping
- **Package Validation**: Comprehensive validation of SCORM packages and manifests
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **Error Handling**: Robust error handling with detailed error messages
- **Package Information**: Detailed view of package structure, organizations, and resources
- **Real-time Progress**: Loading progress tracking and status updates
- **Easy Integration**: Simple API for loading SCORM packages programmatically

## Technical Implementation

### SCORM API Implementation

The application includes a complete SCORM API implementation supporting:

#### SCORM 1.2 API Methods:
- `LMSInitialize()`, `LMSFinish()`
- `LMSGetValue()`, `LMSSetValue()`
- `LMSCommit()`
- `LMSGetLastError()`, `LMSGetErrorString()`, `LMSGetDiagnostic()`

#### SCORM 2004 API Methods:
- `Initialize()`, `Terminate()`
- `GetValue()`, `SetValue()`
- `Commit()`
- `GetLastError()`, `GetErrorString()`, `GetDiagnostic()`

### Content Parsing

- **ZIP Package Handling**: Extracts and processes SCORM packages
- **XML Manifest Parsing**: Parses `imsmanifest.xml` files
- **Resource Management**: Handles file references and content delivery
- **Entry Point Detection**: Automatically finds and loads the main content

### Data Model Support

Supports key SCORM data model elements:
- Completion status (`cmi.core.lesson_status`, `cmi.completion_status`)
- Scoring (`cmi.core.score.raw`, `cmi.score.scaled`)
- Time tracking (`cmi.core.session_time`, `cmi.session_time`)
- Location tracking (`cmi.core.lesson_location`, `cmi.location`)
- Suspend data (`cmi.suspend_data`)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd scorm-reader
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. **Load SCORM Package**: Enter the URL of a SCORM package (.zip file) in the input field
2. **Select Version**: Choose between SCORM 1.2 or SCORM 2004
3. **Load Package**: Click "Load Package" to fetch and parse the SCORM content
4. **View Content**: The SCORM content will be displayed in the player interface
5. **Package Information**: Click "Show Info" to view detailed package structure and validation results

### Programmatic Usage

You can also load SCORM packages programmatically using the SCORMParser class:

```typescript
import { SCORMParser } from '@/lib/scorm-parser';

// Simple loading
const packageData = await SCORMParser.openFromUrl(
  'https://example.com/scorm-package.zip'
);

// With progress tracking
const packageData = await SCORMParser.openFromUrl(
  'https://example.com/scorm-package.zip',
  (progress) => console.log(`Loading: ${progress}%`)
);

// Using instance methods
const parser = new SCORMParser();
const packageData = await parser.loadFromUrl(
  'https://example.com/scorm-package.zip',
  (progress) => console.log(`Progress: ${progress}%`)
);

// Get entry point and content
const entryPoint = parser.getEntryPoint(packageData);
const content = parser.getResourceContent(packageData, entryPoint);
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Main application page
│   └── example/
│       └── page.tsx             # Example page demonstrating SCORM loading
├── components/
│   ├── SCORMPlayer.tsx          # Main SCORM player component
│   ├── SCORMLoader.tsx          # Standalone SCORM package loader
│   ├── SCORMInfo.tsx            # Package information display
│   ├── ValidationDisplay.tsx    # Validation results display
│   └── ErrorBoundary.tsx        # Error boundary component
├── lib/
│   ├── scorm-api.ts             # SCORM API implementation
│   ├── scorm-parser.ts          # SCORM package parser with URL loading
│   ├── scorm-validator.ts       # Package validation logic
│   └── __tests__/
│       └── scorm-parser.test.ts # Unit tests for SCORM parser
└── types/
    └── scorm.ts                 # TypeScript type definitions
```

## API Reference

### SCORMPlayer Component

```tsx
<SCORMPlayer
  packageUrl="https://example.com/scorm-package.zip"
  version="1.2" // or "2004"
  onError={(error) => console.error(error)}
  onProgress={(progress) => console.log(progress)}
  onPackageLoaded={(data) => console.log(data)}
  className="custom-class"
/>
```

### SCORMValidator

```typescript
// Validate URL
const urlValidation = SCORMValidator.validateURL(url);

// Validate package
const packageValidation = SCORMValidator.validatePackage(packageData);

// Validate SCORM version
const versionValidation = SCORMValidator.validateSCORMVersion(version);
```

## Browser Compatibility

- Modern browsers with ES6+ support
- CORS-enabled servers for loading external SCORM packages
- JavaScript enabled

## Limitations

- Requires CORS headers for external SCORM packages
- Some SCORM packages may require specific server configurations
- Limited to web-deliverable content (HTML, CSS, JavaScript)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## SCORM Standards

This implementation follows the official SCORM specifications:
- [SCORM 1.2](https://www.adlnet.gov/adl-research/scorm/)
- [SCORM 2004](https://www.adlnet.gov/adl-research/scorm/)

For more information about SCORM standards, visit the [ADL Initiative website](https://www.adlnet.gov/).