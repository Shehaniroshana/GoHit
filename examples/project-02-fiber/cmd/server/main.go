package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
)

type CreateUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
}

func main() {
	app := fiber.New()

	// Direct routes
	app.Get("/fiber", func(c *fiber.Ctx) error {
		return c.SendString("Hello, Fiber!")
	})

	api := app.Group("/fiber/api")
	v1 := api.Group("/v1")
	v2 := api.Group("/v2")

	// v1 routes
	v1.Post("/users", func(c *fiber.Ctx) error {
		var req CreateUserRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(201).JSON(req)
	})

	// v2 routes
	v2.Get("/users/:id", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"version": "v2", "id": c.Params("id")})
	})

	v2.Put("/users/:id/profile", func(c *fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{"status": "updated"})
	})

	// Deeply nested Fiber route
	admin := app.Group("/admin/system/v1")
	admin.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	log.Fatal(app.Listen(":3000"))
}
