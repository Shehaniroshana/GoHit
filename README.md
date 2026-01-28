# GoHit - API Handler Tester for VS Code

Test your Go API endpoints directly from your code, without leaving VS Code.

## Features

- 🎯 **Automatic Handler Detection** - Detects Go API handlers in net/http, Gin, Fiber, and Echo
- 🚀 **Inline API Testing** - Test endpoints without switching to Postman
- 📝 **Smart Request Generation** - Auto-generates request bodies from Go structs
- 🌍 **Environment Management** - Switch between local, dev, staging, and production
- ⚡ **Fast & Integrated** - Stay in your flow, test faster

## Supported Frameworks

- **net/http** - Standard library HTTP handlers
- **Gin** - Popular web framework
- **Fiber** - Express-inspired framework
- **Echo** - High-performance framework

## Usage

1. Open a Go file with an API handler
2. Right-click and select **"GoHit: Test API Endpoint"**
3. The API testing panel will open with auto-detected endpoint
4. Modify headers/body as needed
5. Click **Send Request**
6. View the response

## Configuration

Configure environments in VS Code settings:

```json
{
  "gohit.environments": [
    {
      "name": "local",
      "baseUrl": "http://localhost:8080"
    },
    {
      "name": "dev",
      "baseUrl": "https://dev.api.com"
    }
  ],
  "gohit.activeEnvironment": "local"
}
```

## Commands

- **GoHit: Test API Endpoint** - Open API tester for current handler
- **GoHit: Manage Environments** - Configure environment settings

## Requirements

- VS Code 1.85.0 or higher
- Go project with supported frameworks

## Extension Settings

This extension contributes the following settings:

- `gohit.environments`: Array of environment configurations
- `gohit.activeEnvironment`: Currently active environment name

## Release Notes

### 0.1.0

Initial MVP release with Go support for net/http, Gin, Fiber, and Echo frameworks.

## License

MIT

---

**Enjoy testing your APIs faster with GoHit!** 🚀
