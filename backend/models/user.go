package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Email        string `gorm:"type:varchar(255);unique;not null;column:email"`
	PasswordHash string `gorm:"type:varchar(255);not null;column:password"`
}
