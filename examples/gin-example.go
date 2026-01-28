package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type CreateProductRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`
	Price       float64 `json:"price" binding:"required"`
	Quantity    int     `json:"quantity"`
	Category    string  `json:"category"`
}

type UpdateProductRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Quantity    int     `json:"quantity"`
}

type ProductResponse struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Quantity    int     `json:"quantity"`
	Category    string  `json:"category"`
}

func main() {
	r := gin.Default()

	r.GET("/api/products", listProducts)
	r.GET("/api/products/:id", getProduct)
	r.POST("/api/products", createProduct)
	r.PUT("/api/products/:id", updateProduct)
	r.DELETE("/api/products/:id", deleteProduct)

	r.Run(":8080")
}

func listProducts(c *gin.Context) {
	products := []ProductResponse{
		{ID: 1, Name: "Laptop", Description: "High-end laptop", Price: 999.99, Quantity: 10, Category: "Electronics"},
		{ID: 2, Name: "Mouse", Description: "Wireless mouse", Price: 29.99, Quantity: 50, Category: "Electronics"},
	}

	c.JSON(http.StatusOK, products)
}

func getProduct(c *gin.Context) {
	id := c.Param("id")

	product := ProductResponse{
		ID:          1,
		Name:        "Laptop",
		Description: "High-end laptop",
		Price:       999.99,
		Quantity:    10,
		Category:    "Electronics",
	}

	c.JSON(http.StatusOK, product)
}

func createProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := ProductResponse{
		ID:          123,
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Quantity:    req.Quantity,
		Category:    req.Category,
	}

	c.JSON(http.StatusCreated, response)
}

func updateProduct(c *gin.Context) {
	id := c.Param("id")
	var req UpdateProductRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product updated", "id": id})
}

func deleteProduct(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted", "id": id})
}
