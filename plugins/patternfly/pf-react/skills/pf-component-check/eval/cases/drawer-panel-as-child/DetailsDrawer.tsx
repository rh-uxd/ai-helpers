import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerPanelContent,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  DrawerPanelBody,
} from '@patternfly/react-core';

interface DetailsDrawerProps {
  isExpanded: boolean;
  onClose: () => void;
  children: React.ReactNode;
  panelBody: React.ReactNode;
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  isExpanded,
  onClose,
  children,
  panelBody,
}) => (
  <Drawer isExpanded={isExpanded}>
    <DrawerContent>
      <div>{children}</div>
      <DrawerPanelContent>
        <DrawerHead>
          Details
          <DrawerActions>
            <DrawerCloseButton onClick={onClose} />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody>{panelBody}</DrawerPanelBody>
      </DrawerPanelContent>
    </DrawerContent>
  </Drawer>
);
