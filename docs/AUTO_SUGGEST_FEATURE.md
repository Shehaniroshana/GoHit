# Auto-Suggest HTTP Method Feature

## Overview
The GoHit extension now includes an intelligent auto-suggest feature that automatically suggests endpoints and their HTTP methods as you type in the URL field.

## Features

### 🎯 Smart Endpoint Suggestions
- **Automatic Detection**: Scans all Go files in your workspace to find HTTP endpoints
- **Real-time Filtering**: Shows relevant suggestions as you type the URL
- **Method Auto-Population**: Automatically fills in the HTTP method when you select an endpoint
- **Body Example Generation**: Automatically populates request body with example JSON from Go structs

### 🔍 What Gets Detected
The feature scans and detects endpoints from popular Go web frameworks:
- **Gin** - `router.GET()`, `router.POST()`, etc.
- **Fiber** - `app.Get()`, `app.Post()`, etc.
- **Echo** - `e.GET()`, `e.POST()`, etc.
- **net/http** - `http.HandleFunc()`

### 🎨 Visual Features
- **Color-coded HTTP Methods**: Each HTTP method has a distinct color
  - GET: Blue (#61affe)
  - POST: Green (#49cc90)
  - PUT: Orange (#fca130)
  - PATCH: Cyan (#50e3c2)
  - DELETE: Red (#f93e3e)
  - OPTIONS: Purple (#9012fe)
  - HEAD: Gray (#aaa)
- **Framework Badge**: Shows which framework the endpoint is from
- **Path Display**: Shows the full endpoint path

### ⌨️ Keyboard Navigation
- **Arrow Down/Up**: Navigate through suggestions
- **Enter**: Select the highlighted suggestion
- **Escape**: Close the suggestion dropdown
- **Click**: Click on any suggestion to select it

## How It Works

### 1. **Workspace Scanning**
When the extension activates or the webview opens, it:
- Searches for all `.go` files in the workspace
- Parses each file to extract HTTP endpoint definitions
- Stores the endpoints for quick access

### 2. **Real-time Filtering**
As you type in the URL field:
- The extension filters endpoints that match your query
- Matching is done on both the path and HTTP method
- Shows up to 10 most relevant results

### 3. **Auto-Population**
When you select a suggestion:
- The URL field is populated with the endpoint path
- The HTTP method dropdown is automatically set to the correct method
- **The request body is automatically filled with example JSON** (for POST/PUT/PATCH endpoints)
- The suggestion dropdown closes automatically

### 4. **Smart Struct Analysis**
The extension uses two strategies to find the correct request body struct:

**Strategy A: Code Analysis (The "Smart" Way)**
1. Identifies the handler function for the endpoint (e.g., `handleCreateThing`)
2. Analyze the function body to find where JSON binding occurs
   - Looks for `c.ShouldBindJSON(&var)`, `json.Decode(&var)`, etc.
3. Finds the type declaration of that variable (e.g., `var data ProductData`)
4. Uses that exact struct (`ProductData`) to generate the example
*This works for **any project**, regardless of naming conventions!*

**Strategy B: Keyword Fallback**
If code analysis fails, it searches for structs in the file with keywords like:
- "Request", "DTO", "Input", "Create", "Update"

## Usage Example

1. **Open the GoHit API Tester**
   - Click on any endpoint in your Go code
   - Run the "GoHit: Test Endpoint" command

2. **Start Typing**
   - In the URL field, start typing `/api` or `/users`
   - A dropdown will appear with matching endpoints

3. **Select an Endpoint**
   - Use arrow keys to navigate or click on a suggestion
   - The URL and HTTP method will be automatically filled
   - **For POST/PUT/PATCH: Request body will be auto-populated with example JSON**

4. **Review and Send**
   - Review or modify the auto-generated request body
   - Click "Send Request" to test the endpoint

## Technical Details

### Architecture
```
┌─────────────────────────────────────┐
│  EndpointSuggestionService          │
│  - Scans workspace for Go files     │
│  - Parses endpoints using GoParser  │
│  - Provides filtering functionality │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  WebviewPanel                       │
│  - Manages suggestion service       │
│  - Handles search requests          │
│  - Sends suggestions to UI          │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Webview UI (HTML/JS)               │
│  - Displays autocomplete dropdown   │
│  - Filters suggestions locally      │
│  - Handles keyboard navigation      │
│  - Auto-fills URL and method        │
└─────────────────────────────────────┘
```

### Performance Considerations
- **Lazy Loading**: Endpoints are collected in the background
- **Result Limiting**: Only shows top 10 matching results
- **Client-side Filtering**: Fast filtering happens in the webview
- **Cache**: Suggestions are cached until manually refreshed

### Future Enhancements
Potential improvements for the feature:
- [ ] Fuzzy matching for better search
- [ ] Sorting by relevance/frequency of use
- [ ] Path parameter auto-population
- [ ] Request body templates based on struct analysis
- [ ] Recent endpoints history
- [ ] Favorite/pinned endpoints

## API Reference

### Message Types

#### From Extension to Webview
```typescript
{
  type: 'suggestions',
  data: EndpointSuggestion[]
}
```

#### From Webview to Extension
```typescript
// Search for endpoints
{
  type: 'searchEndpoints',
  query: string
}

// Refresh endpoint cache
{
  type: 'refreshEndpoints'
}
```

### Data Structures

```typescript
interface EndpointSuggestion {
    method: string;      // HTTP method (GET, POST, etc.)
    path: string;        // Endpoint path (/api/users)
    framework: string;   // Framework name (gin, fiber, etc.)
    file: string;        // Source file path
    line: number;        // Line number in source file
    bodyExample?: any;   // Optional request body example (for POST/PUT/PATCH)
}
```

## Troubleshooting

### No Suggestions Appearing
1. Check that you have Go files in your workspace
2. Ensure your endpoints are using supported frameworks
3. Try refreshing the extension window

### Incorrect Endpoints Detected
The parser uses regex patterns which may occasionally detect false positives. The following patterns are used:
- Gin: `router.(GET|POST|PUT|...)`
- Fiber: `app.(Get|Post|Put|...)`
- Echo: `e.(GET|POST|PUT|...)`
- net/http: `http.HandleFunc`

### Suggestions Not Updating
The endpoint cache is built when the extension loads. If you add new endpoints:
1. Reload the VS Code window, or
2. Close and reopen the GoHit panel

## Contributing
To contribute to this feature:
1. See `src/webview/endpointSuggestionService.ts` for the scanning logic
2. See `src/webview/panel.ts` for the message handling
3. See `src/webview/ui/index.html` for the UI implementation
