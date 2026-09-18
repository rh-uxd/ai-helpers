import React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@patternfly/react-core';

interface ConfirmationModalProps {
  title: string;
  message: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  isOpen,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}) => {
  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onCancel}
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-body"
    >
      <ModalHeader
        title={title}
        labelId="confirmation-modal-title"
      />
      <ModalBody id="confirmation-modal-body">
        {message}
      </ModalBody>
      <ModalFooter>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="link" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
