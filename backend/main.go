package main

import (
	"log"
	"os"

	"finance-manager-backend/controllers"
	"finance-manager-backend/database"
	"finance-manager-backend/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/gin-contrib/cors"
)

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: Error loading .env file")
	}

	// Connect to database
	database.ConnectDB()

	// Initialize Gin router
	r := gin.Default()

	// Add CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Basic route
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Finance Manager API is running",
		})
	})

	auth := r.Group("/api/v1/auth")
	auth.POST("/register", controllers.Register)
	auth.POST("/login", controllers.Login)

	// Protected Finance Routes
	finance := r.Group("/api/v1/finance")
	finance.Use(middleware.RequireAuth) // Apply the JWT middleware
	finance.GET("/dashboard", controllers.GetDashboard)
	finance.POST("/accounts", controllers.CreateAccount)
	finance.POST("/targets", controllers.CreateTarget)
	finance.POST("/transactions", controllers.CreateTransaction)
	finance.GET("/transactions", controllers.GetTransactions)
	finance.POST("/recurring", controllers.CreateRecurring)
	finance.GET("/recurring", controllers.GetRecurring)
	finance.GET("/recurring/pending", controllers.GetPendingRecurring)
	finance.POST("/recurring/confirm/:id", controllers.ConfirmRecurring)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r.Run(":" + port)
}
