import React from 'react';
import { Card, Button } from '@patternfly/react-core';

interface ServiceSummaryCardProps {
  name: string;
  description: string;
  onManage: () => void;
}

/** Invalid: body content must sit in CardBody (or CardHeader / CardFooter). */
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
