import React from 'react';
import { Alert as CoreAlert, Button } from '@patternfly/react-core';
import { Alert as DeepAlert } from '@patternfly/react-core/dist/esm/components/Alert';
import { Tooltip } from '@patternfly/react-core';

export const NotificationBar = () => (
  <div>
    <CoreAlert variant="info" title="New message">
      <Tooltip content="Click to dismiss">
        <Button variant="link">Dismiss</Button>
      </Tooltip>
    </CoreAlert>
  </div>
);
