package handlers

import (
	"net/http"

	"github.com/example/api-server/internal/dto"
	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	// Service layer would go here
}

func NewProductHandler() *ProductHandler {
	return &ProductHandler{}
}

// @gohit POST /api/v1/products dto.CreateProductRequest
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req dto.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp := dto.ProductResponse{
		ID:          1,
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		CategoryID:  req.CategoryID,
	}

	c.JSON(http.StatusCreated, resp)
}

// @gohit GET /api/v1/products
func (h *ProductHandler) ListProducts(c *gin.Context) {
	products := []dto.ProductResponse{
		{ID: 1, Name: "Laptop", Price: 999.99, Stock: 50, CategoryID: 1},
		{ID: 2, Name: "Mouse", Price: 29.99, Stock: 200, CategoryID: 2},
	}
	c.JSON(http.StatusOK, gin.H{"products": products})
}

// @gohit GET /api/v1/products/:id
func (h *ProductHandler) GetProduct(c *gin.Context) {
	id := c.Param("id")

	product := dto.ProductResponse{
		ID:          1,
		Name:        "Laptop",
		Description: "High-performance laptop",
		Price:       999.99,
		Stock:       50,
		CategoryID:  1,
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "product": product})
}

// @gohit PUT /api/v1/products/:id dto.UpdateProductRequest
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp := dto.ProductResponse{
		ID:          1,
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		CategoryID:  req.CategoryID,
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "product": resp})
}

// @gohit DELETE /api/v1/products/:id
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted", "id": id})
}
