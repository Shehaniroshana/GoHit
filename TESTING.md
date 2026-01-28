# How to Run and Test GoHit Extension

## Quick Start

### 1. Install Dependencies
```bash
cd "d:\for moon\GoHit"
npm install
```

### 2. Compile TypeScript
```bash
npm run compile
```

### 3. Launch Extension Development
- Open the project in VS Code
- Press **F5** to start debugging
- A new VS Code window opens (Extension Development Host)

### 4. Test the Extension

#### Option A: Use Example Files
1. In the Extension Development Host window, open folder: `d:\for moon\GoHit\examples`
2. Open any example file (e.g., `gin-example.go`)
3. Place cursor on a route handler line:
   ```go
   r.POST("/api/products", createProduct)
   ```
4. **Right-click** → Select **"GoHit: Test API Endpoint"**
5. The API tester panel opens!

#### Option B: Use Your Own Go Project
1. Open your Go project in the Extension Development Host
2. Navigate to any file with API handlers
3. Place cursor on a handler line
4. **Right-click** → **"GoHit: Test API Endpoint"**

### 5. Test API Requests

#### With a Running Server:
```bash
# Terminal 1 - Start example server
cd "d:\for moon\GoHit\examples"
go run nethttp-example.go
```

#### In the GoHit Panel:
1. Select environment: **local**
2. Method: **POST**
3. URL: `/api/users/create`
4. Body (auto-generated):
   ```json
   {
     "name": "John Doe",
     "email": "john@example.com",
     "age": 30,
     "isActive": true
   }
   ```
5. Click **Send Request**
6. View response!

---

## Testing Each Framework

### net/http
```bash
go run examples/nethttp-example.go
```
Test endpoints:
- GET `/api/users`
- POST `/api/users/create`
- POST `/api/users/update`
- POST `/api/users/delete`

### Gin
```bash
go get -u github.com/gin-gonic/gin
go run examples/gin-example.go
```
Test endpoints:
- GET `/api/products`
- GET `/api/products/:id`
- POST `/api/products`
- PUT `/api/products/:id`
- DELETE `/api/products/:id`

### Fiber
```bash
go get -u github.com/gofiber/fiber/v2
go run examples/fiber-example.go
```
Test endpoints:
- GET `/api/orders`
- POST `/api/orders`
- PUT `/api/orders/:id`

### Echo
```bash
go get -u github.com/labstack/echo/v4
go run examples/echo-example.go
```
Test endpoints:
- GET `/api/tasks`
- POST `/api/tasks`
- DELETE `/api/tasks/:id`

---

## Environment Management

### Add New Environment
1. Press `Ctrl+Shift+P`
2. Type: **"GoHit: Manage Environments"**
3. Select **"Add Environment"**
4. Enter name: `dev`
5. Enter URL: `https://dev-api.example.com`

### Switch Environment
1. Use the dropdown in the API tester panel
2. OR use command palette: **"GoHit: Manage Environments"** → **"Switch Environment"**

---

## Troubleshooting

### Extension Not Activating
- Ensure you're opening a `.go` file
- Check the Output panel (View → Output → Select "GoHit")

### Endpoint Not Detected
- Make sure cursor is on the handler line
- Verify the framework syntax matches supported patterns
- Check logger output for details

### Compilation Errors
```bash
# Clean and rebuild
rm -rf out node_modules
npm install
npm run compile
```

### Server Connection Failed
- Ensure the Go server is running
- Check the port matches the environment URL
- Verify firewall settings

---

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-recompile)
npm run watch

# Lint code
npm run lint

# Package extension
vsce package
```

---

## Next Steps

Once tested locally:

1. **Create an icon**: Add `icon.png` (128x128px) to root
2. **Package**: `vsce package` → creates `gohit-0.1.0.vsix`
3. **Install locally**: `code --install-extension gohit-0.1.0.vsix`
4. **Publish**: `vsce publish` (requires publisher account)

---

## Support

For issues or questions:
- Check the logger: View → Output → "GoHit"
- Review example files in `/examples`
- Refer to [walkthrough.md](file:///C:/Users/MSI/.gemini/antigravity/brain/141b3670-be10-4409-a1a1-ad6e8ccf99f6/walkthrough.md)
