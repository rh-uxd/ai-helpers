import React from 'react';
import {
  Card,
  CardTitle,
  CardBody,
  Label,
  Alert,
} from '@patternfly/react-core';

interface StatusPanelProps {
  errorCount: number;
  warningCount: number;
  items: string[];
  message?: string;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  errorCount,
  warningCount,
  items,
  message,
}) => {
  return (
    <Card>
      <CardTitle>System Status</CardTitle>
      <CardBody>
        {errorCount && (
          <Alert variant="danger" title={`${errorCount} errors detected`} />
        )}

        {warningCount && (
          <Label color="orange">{warningCount} warnings</Label>
        )}

        {items.length && (
          <ul>
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}

        {message && <p>{message}</p>}
      </CardBody>
    </Card>
  );
};
