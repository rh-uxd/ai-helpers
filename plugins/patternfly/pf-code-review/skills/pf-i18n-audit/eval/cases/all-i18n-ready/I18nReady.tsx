import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardTitle, CardBody, EmptyState, Title } from '@patternfly/react-core';

interface SummaryProps {
  itemCount: number;
  lastUpdated: Date;
  price: number;
  categories: string[];
}

export const Summary: React.FC<SummaryProps> = ({
  itemCount,
  lastUpdated,
  price,
  categories,
}) => {
  const { t } = useTranslation();

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(lastUpdated);

  const formattedPrice = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(price);

  const formattedList = new Intl.ListFormat(undefined, {
    style: 'long',
    type: 'conjunction',
  }).format(categories);

  if (itemCount === 0) {
    return (
      <EmptyState>
        <Title headingLevel="h4">{t('summary.noItems')}</Title>
      </EmptyState>
    );
  }

  return (
    <Card>
      <CardTitle>{t('summary.title')}</CardTitle>
      <CardBody>
        <p>{t('summary.itemCount', { count: itemCount })}</p>
        <p>{t('summary.lastUpdated', { date: formattedDate })}</p>
        <p>{t('summary.total', { price: formattedPrice })}</p>
        <p>{t('summary.categories', { list: formattedList })}</p>
      </CardBody>
    </Card>
  );
};
