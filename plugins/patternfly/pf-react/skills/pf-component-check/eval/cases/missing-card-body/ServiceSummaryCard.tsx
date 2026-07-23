import React from 'react';
import { Card, Button } from '@patternfly/react-core';

interface ServiceSummaryCardProps {
  name: string;
  description: string;
  onManage: () => void;
}

export const ServiceSummaryCard: React.FC<ServiceSummaryCardProps> = ({
  name,
  description,
  onManage,
}) => (
  <Card>
    <h2>{name}</h2>
    <p>{description}</p>
    <Button variant="primary" onClick={onManage}>
      Manage
    </Button>
  </Card>
);
