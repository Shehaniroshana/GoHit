package dto

// User DTOs
type CreateUserRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role" binding:"required,oneof=admin user guest"`
}

type UpdateUserRequest struct {
	Name  string `json:"name"`
	Email string `json:"email" binding:"email"`
	Role  string `json:"role" binding:"oneof=admin user guest"`
}

type UserResponse struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// Product DTOs
type CreateProductRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`
	Price       float64 `json:"price" binding:"required,gt=0"`
	Stock       int     `json:"stock" binding:"required,gte=0"`
	CategoryID  int     `json:"category_id" binding:"required"`
}

type UpdateProductRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price" binding:"gt=0"`
	Stock       int     `json:"stock" binding:"gte=0"`
	CategoryID  int     `json:"category_id"`
}

type ProductResponse struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	CategoryID  int     `json:"category_id"`
}

// Order DTOs
type CreateOrderRequest struct {
	UserID          int                `json:"user_id" binding:"required"`
	Items           []OrderItemRequest `json:"items" binding:"required,min=1,dive"`
	ShippingAddress string             `json:"shipping_address" binding:"required"`
}

type OrderItemRequest struct {
	ProductID int `json:"product_id" binding:"required"`
	Quantity  int `json:"quantity" binding:"required,gt=0"`
}

type OrderResponse struct {
	ID              int     `json:"id"`
	UserID          int     `json:"user_id"`
	Total           float64 `json:"total"`
	Status          string  `json:"status"`
	ShippingAddress string  `json:"shipping_address"`
}
