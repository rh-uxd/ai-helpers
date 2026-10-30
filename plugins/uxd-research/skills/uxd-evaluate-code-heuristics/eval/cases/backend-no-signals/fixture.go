package billing

import (
	"context"
	"fmt"
	"time"
)

type Invoice struct {
	ID        string
	Amount    float64
	Currency  string
	IssuedAt  time.Time
	PaidAt    *time.Time
}

type InvoiceStore interface {
	Get(ctx context.Context, id string) (*Invoice, error)
	Delete(ctx context.Context, id string) error
	ListByDate(ctx context.Context, from, to time.Time) ([]Invoice, error)
}

func ReconcilePeriod(ctx context.Context, store InvoiceStore, from, to time.Time) (int, error) {
	invoices, err := store.ListByDate(ctx, from, to)
	if err != nil {
		return 0, fmt.Errorf("listing invoices: %w", err)
	}

	reconciled := 0
	for _, inv := range invoices {
		if inv.PaidAt != nil {
			continue
		}
		if err := store.Delete(ctx, inv.ID); err != nil {
			return reconciled, fmt.Errorf("deleting unpaid invoice %s: %w", inv.ID, err)
		}
		reconciled++
	}
	return reconciled, nil
}
