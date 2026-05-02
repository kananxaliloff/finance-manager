package controllers

import (
	"finance-manager-backend/database"
	"finance-manager-backend/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type CreateRecurringInput struct {
	Amount               float64                `json:"amount" binding:"required"`
	Currency             string                 `json:"currency" binding:"required"`
	Type                 models.TransactionType `json:"type" binding:"required"`
	Description          string                 `json:"description"`
	SourceAccountID      *uint                  `json:"sourceAccountId"`
	DestinationAccountID *uint                  `json:"destinationAccountId"`
	TargetID             *uint                  `json:"targetId"`
	DayOfMonth           int                    `json:"dayOfMonth" binding:"required"`
}

func CreateRecurring(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input CreateRecurringInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var uid uint
	switch v := userID.(type) {
	case float64:
		uid = uint(v)
	case uint:
		uid = v
	}

	recurring := models.RecurringTransaction{
		UserID:               uid,
		Amount:               input.Amount,
		Currency:             input.Currency,
		Type:                 input.Type,
		Description:          input.Description,
		SourceAccountID:      input.SourceAccountID,
		DestinationAccountID: input.DestinationAccountID,
		TargetID:             input.TargetID,
		DayOfMonth:           input.DayOfMonth,
		IsActive:             true,
	}

	if err := database.DB.Create(&recurring).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create recurring transaction"})
		return
	}

	c.JSON(http.StatusCreated, recurring)
}

func GetRecurring(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var uid uint
	switch v := userID.(type) {
	case float64:
		uid = uint(v)
	case uint:
		uid = v
	}

	recurring := []models.RecurringTransaction{}
	if err := database.DB.Where("user_id = ?", uid).Find(&recurring).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recurring transactions"})
		return
	}

	c.JSON(http.StatusOK, recurring)
}

func GetPendingRecurring(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var uid uint
	switch v := userID.(type) {
	case float64:
		uid = uint(v)
	case uint:
		uid = v
	}

	// Get all active recurring transactions for this user
	var recurring []models.RecurringTransaction
	if err := database.DB.Where("user_id = ? AND is_active = ?", uid, true).Find(&recurring).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recurring transactions"})
		return
	}

	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	
	pending := []models.RecurringTransaction{}

	for _, r := range recurring {
		// Check if a transaction for this recurring rule already exists in this month
		var count int64
		database.DB.Model(&models.Transaction{}).
			Where("user_id = ? AND recurring_transaction_id = ? AND created_at >= ?", uid, r.ID, startOfMonth).
			Count(&count)

		if count == 0 {
			// If it's the right day or past the day, it's pending
			if now.Day() >= r.DayOfMonth {
				pending = append(pending, r)
			}
		}
	}

	c.JSON(http.StatusOK, pending)
}

func ConfirmRecurring(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var uid uint
	switch v := userID.(type) {
	case float64:
		uid = uint(v)
	case uint:
		uid = v
	}

	id := c.Param("id")
	var recurring models.RecurringTransaction
	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).First(&recurring).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Recurring transaction not found"})
		return
	}

	// Create the actual transaction
	transaction := models.Transaction{
		UserID:               uid,
		Amount:               recurring.Amount,
		Currency:             recurring.Currency,
		Type:                 recurring.Type,
		Description:          recurring.Description,
		SourceAccountID:      recurring.SourceAccountID,
		DestinationAccountID: recurring.DestinationAccountID,
		TargetID:             recurring.TargetID,
		RecurringTransactionID: &recurring.ID,
	}

	if err := database.DB.Create(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute transaction"})
		return
	}

	c.JSON(http.StatusOK, transaction)
}
