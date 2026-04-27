package models

import "gorm.io/gorm"

type TargetType string

const (
	Saving   TargetType = "SAVING"
	Debt     TargetType = "DEBT"
	Purchase TargetType = "PURCHASE"
)

type Target struct {
	gorm.Model
	UserID         uint       `gorm:"not null;index"`
	Name           string     `gorm:"type:varchar(255);not null"`
	AssignedAmount float64    `gorm:"type:decimal(12,2);not null;default:0"`
	Currency       string     `gorm:"type:varchar(10);not null;default:'AZN'"`
	Type           TargetType `gorm:"type:varchar(20);not null;default:'SAVING'"`
	Note           *string    `gorm:"type:text;null"`

	// Foreign key relation to User
	User User `gorm:"foreignKey:UserID"`
}
