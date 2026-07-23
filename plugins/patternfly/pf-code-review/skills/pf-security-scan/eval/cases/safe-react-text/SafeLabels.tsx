import React from 'react';
import { Label, Button } from '@patternfly/react-core';

interface SafeLabelsProps {
  userDisplayName: string;
  trustedUrl: string;
}

export const SafeLabels: React.FC<SafeLabelsProps> = ({ userDisplayName, trustedUrl }) => (
  <>
    <Label>{userDisplayName}</Label>
    <Button component="a" href={trustedUrl} target="_blank" rel="noopener noreferrer">
      Documentation
    </Button>
  </>
);
