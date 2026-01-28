package main

import (
	"github.com/gofiber/fiber/v2"
)

type CreateOrderRequest struct {
	CustomerID int      `json:"customerId"`
	Items      []string `json:"items"`
	Total      float64  `json:"total"`
	Status     string   `json:"status"`
}

type UpdateOrderRequest struct {
	Status string  `json:"status"`
	Total  float64 `json:"total"`
}

type OrderResponse struct {
	ID         int      `json:"id"`
	CustomerID int      `json:"customerId"`
	Items      []string `json:"items"`
	Total      float64  `json:"total"`
	Status     string   `json:"status"`
}

func main() {
	app := fiber.New()

	app.Get("/api/orders", listOrders)
	app.Get("/api/orders/:id", getOrder)
	app.Post("/api/orders", createOrder)
	app.Put("/api/orders/:id", updateOrder)
	app.Delete("/api/orders/:id", deleteOrder)

	app.Listen(":8080")
}

func listOrders(c *fiber.Ctx) error {
	orders := []OrderResponse{
		{ID: 1, CustomerID: 1001, Items: []string{"Item1", "Item2"}, Total: 150.50, Status: "pending"},
		{ID: 2, CustomerID: 1002, Items: []string{"Item3"}, Total: 75.00, Status: "completed"},
	}

	return c.JSON(orders)
}

func getOrder(c *fiber.Ctx) error {
	id := c.Params("id")

	order := OrderResponse{
		ID:         1,
		CustomerID: 1001,
		Items:      []string{"Item1", "Item2"},
		Total:      150.50,
		Status:     "pending",
	}

	return c.JSON(order)
}

func createOrder(c *fiber.Ctx) error {
	var req CreateOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	response := OrderResponse{
		ID:         123,
		CustomerID: req.CustomerID,
		Items:      req.Items,
		Total:      req.Total,
		Status:     req.Status,
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

func updateOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateOrderRequest

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Order updated", "id": id})
}

func deleteOrder(c *fiber.Ctx) error {
	id := c.Params("id")
	return c.JSON(fiber.Map{"message": "Order deleted", "id": id})
}
