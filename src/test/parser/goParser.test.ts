import { expect } from 'chai';
import { GoParser } from '../../parser/goParser';

describe('GoParser', () => {
    let parser: GoParser;

    beforeEach(() => {
        parser = new GoParser();
    });

    describe('Framework Detection', () => {
        it('should detect Gin framework from import', () => {
            const content = `
                package main
                import "github.com/gin-gonic/gin"
                func main() {
                    r := gin.Default()
                    r.GET("/ping", func(c *gin.Context) { c.JSON(200, gin.H{"m": "p"}) })
                }
            `;
            const result = parser.parse(content, 'main.go');
            expect(result.endpoints.length).to.be.at.least(1);
            expect(result.endpoints[0].framework).to.equal('gin');
        });

        it('should detect Gin framework from gin.Engine pointer', () => {
            const content = `
                package routes
                import "github.com/gin-gonic/gin"
                func Setup(r *gin.Engine) {
                    r.GET("/api", handler)
                }
            `;
            const result = parser.parse(content, 'routes.go');
            expect(result.endpoints.length).to.be.at.least(1);
            expect(result.endpoints[0].framework).to.equal('gin');
        });

        it('should detect Fiber framework', () => {
            const content = `
                package main
                import "github.com/gofiber/fiber/v2"
                func main() {
                    app := fiber.New()
                    app.Get("/fiber", func(c *fiber.Ctx) error { return nil })
                }
            `;
            const result = parser.parse(content, 'main.go');
            expect(result.endpoints.length).to.be.at.least(1);
            expect(result.endpoints[0].framework).to.equal('fiber');
            expect(result.endpoints[0].path).to.equal('/fiber');
        });

        it('should detect Echo framework', () => {
            const content = `
                package main
                import "github.com/labstack/echo/v4"
                func main() {
                    e := echo.New()
                    e.GET("/echo", func(c echo.Context) error { return nil })
                }
            `;
            const result = parser.parse(content, 'main.go');
            expect(result.endpoints.length).to.be.at.least(1);
            expect(result.endpoints[0].framework).to.equal('echo');
            expect(result.endpoints[0].path).to.equal('/echo');
        });

        it('should detect Chi framework', () => {
            const content = `
                package main
                import "github.com/go-chi/chi/v5"
                func main() {
                    r := chi.NewRouter()
                    r.Get("/chi", func(w http.ResponseWriter, r *http.Request) {})
                }
            `;
            const result = parser.parse(content, 'main.go');
            expect(result.endpoints.length).to.be.at.least(1);
            expect(result.endpoints[0].framework).to.equal('chi');
            expect(result.endpoints[0].path).to.equal('/chi');
        });
    });

    describe('WebSocket Heuristics', () => {
        it('should detect WS from /ws path', () => {
            const content = `
                package main
                func Setup(r *gin.Engine) {
                    r.GET("/api/ws", handle)
                }
            `;
            const result = parser.parse(content, 'main.go');
            const ws = result.endpoints.find(e => e.path === '/api/ws');
            expect(ws?.method).to.equal('WS');
        });

        it('should detect WS from handler name containing websocket', () => {
            const content = `
                package main
                func Setup(r *gin.Engine) {
                    r.GET("/chat", ChatWebsocketHandler)
                }
            `;
            const result = parser.parse(content, 'main.go');
            const ws = result.endpoints.find(e => e.path === '/chat');
            expect(ws?.method).to.equal('WS');
        });

        it('should detect WS from /socket path', () => {
            const content = `
                package main
                func Setup(r *gin.Engine) {
                    r.GET("/notifications/socket", h)
                }
            `;
            const result = parser.parse(content, 'main.go');
            const ws = result.endpoints.find(e => e.path === '/notifications/socket');
            expect(ws?.method).to.equal('WS');
        });
    });

    describe('Annotations', () => {
        it('should parse @gohit WS annotation', () => {
            const content = `
                package main
                // @gohit WS /my-custom-ws
                func CustomHandler(c *gin.Context) {}
            `;
            const result = parser.parse(content, 'main.go');
            const ws = result.endpoints.find(e => e.path === '/my-custom-ws');
            expect(ws?.method).to.equal('WS');
            expect(ws?.framework).to.equal('annotation');
        });

        it('should parse @gohit POST with struct name', () => {
            const content = `
                package main
                // @gohit POST /users CreateUserRequest
                func Create(c *gin.Context) {}
            `;
            const result = parser.parse(content, 'main.go');
            const ep = result.endpoints.find(e => e.path === '/users');
            expect(ep?.method).to.equal('POST');
            expect(ep?.handler).to.equal('CreateUserRequest');
        });
    });
});
