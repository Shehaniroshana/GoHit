package main

import (
	"encoding/json"
	"net/http"
)

type CreateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Age      int    `json:"age"`
	IsActive bool   `json:"isActive"`
}

type UpdateUserRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type UserResponse struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Age      int    `json:"age"`
	IsActive bool   `json:"isActive"`
}

func main() {
	http.HandleFunc("/api/users", listUsers)
	http.HandleFunc("/api/users/create", createUser)
	http.HandleFunc("/api/users/update", updateUser)
	http.HandleFunc("/api/users/delete", deleteUser)

	http.ListenAndServe(":8080", nil)
}

func listUsers(w http.ResponseWriter, r *http.Request) {
	users := []UserResponse{
		{ID: 1, Name: "John Doe", Email: "john@example.com", Age: 30, IsActive: true},
		{ID: 2, Name: "Jane Smith", Email: "jane@example.com", Age: 25, IsActive: true},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func createUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	response := UserResponse{
		ID:       123,
		Name:     req.Name,
		Email:    req.Email,
		Age:      req.Age,
		IsActive: req.IsActive,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func updateUser(w http.ResponseWriter, r *http.Request) {
	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User updated"})
}

func deleteUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User deleted"})
}
