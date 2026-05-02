package models

import "gorm.io/gorm"

type RecurringTransaction struct {
	gorm.Model
	UserID               uint            `gorm:"not null;index"`
	Amount               float64         `gorm:"type:decimal(12,2);not null"`
	Currency             string          `gorm:"type:varchar(10);not null;default:'AZN'"`
	Type                 TransactionType `gorm:"type:varchar(20);not null;default:'INCOME'"`
	Description          string          `gorm:"type:text;null"`
	SourceAccountID      *uint           `gorm:"null;index"`
	DestinationAccountID *uint           `gorm:"null;index"`
	TargetID             *uint           `gorm:"null;index"`
	DayOfMonth           int             `gorm:"not null;default:1"`
	IsActive             bool            `gorm:"default:true"`

	// Foreign key relation to User
	User User `gorm:"foreignKey:UserID"`
}
