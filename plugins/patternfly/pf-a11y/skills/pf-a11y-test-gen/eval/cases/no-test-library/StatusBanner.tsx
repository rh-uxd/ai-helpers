import React from 'react';
import {
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core';

interface StatusBannerProps {
  title: string;
  message: string;
  variant: 'success' | 'danger' | 'warning' | 'info';
  onClose?: () => void;
  isLiveRegion?: boolean;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  title,
  message,
  variant,
  onClose,
  isLiveRegion = false,
}) => {
  return (
    <Alert
      variant={variant}
      title={title}
      isLiveRegion={isLiveRegion}
      actionClose={onClose ? <AlertActionCloseButton onClose={onClose} /> : undefined}
    >
      {message}
    </Alert>
  );
};
