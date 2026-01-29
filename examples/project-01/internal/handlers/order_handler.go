package handlers

import (
	"net/http"

	"github.com/example/api-server/internal/dto"
	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	// Service layer
}

func NewOrderHandler() *OrderHandler {
	return &OrderHandler{}
}

// @gohit POST /api/v1/orders dto.CreateOrderRequest
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	var req dto.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp := dto.OrderResponse{
		ID:              1,
		UserID:          req.UserID,
		Total:           299.99,
		Status:          "pending",
		ShippingAddress: req.ShippingAddress,
	}

	c.JSON(http.StatusCreated, resp)
}

// @gohit GET /api/v1/orders
func (h *OrderHandler) ListOrders(c *gin.Context) {
	orders := []dto.OrderResponse{
		{ID: 1, UserID: 1, Total: 299.99, Status: "pending", ShippingAddress: "123 Main St"},
		{ID: 2, UserID: 2, Total: 499.99, Status: "shipped", ShippingAddress: "456 Oak Ave"},
	}
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

// @gohit GET /api/v1/orders/:id
func (h *OrderHandler) GetOrder(c *gin.Context) {
	id := c.Param("id")

	order := dto.OrderResponse{
		ID:              1,
		UserID:          1,
		Total:           299.99,
		Status:          "pending",
		ShippingAddress: "123 Main St",
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "order": order})
}

// @gohit PATCH /api/v1/orders/:id/status
func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=pending processing shipped delivered cancelled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Order status updated",
		"id":      id,
		"status":  req.Status,
	})
}
