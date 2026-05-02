package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type Message struct {
	Text string `json:"text"`
}

func main() {
	http.HandleFunc("/nethttp", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, net/http!")
	})

	http.HandleFunc("/nethttp/api/message", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			var msg Message
			if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			json.NewEncoder(w).Encode(msg)
			return
		}
		fmt.Fprintf(w, "Use POST to send a message")
	})

	fmt.Println("Server starting on :8080")
	http.ListenAndServe(":8080", nil)
}
