import React, { useState } from 'react';
import {
  Page,
  PageSection,
  Button,
  Card,
  CardTitle,
  CardBody,
  Menu,
  MenuContent,
  MenuItem,
  MenuList,
  MenuToggle,
  Popper,
  SkipToContent,
} from '@patternfly/react-core';

const DrawerModal: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  return (
    <Page
      skipToContent={
        <SkipToContent href="#main-content">Skip to main content</SkipToContent>
      }
      mainContainerId="main-content"
    >
      <PageSection id="main-content">
        <Card>
          <CardTitle>Focus Management Test</CardTitle>
          <CardBody>
            <Button variant="primary" onClick={() => setIsDrawerOpen(true)}>
              Open Drawer
            </Button>
            <Button variant="secondary" onClick={() => setIsOverlayOpen(true)}>
              Open Overlay
            </Button>
            <Button variant="tertiary" onClick={() => setIsPopoverOpen(true)}>
              Show Details
            </Button>
            <Popper
              trigger={
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  isExpanded={isMenuOpen}
                >
                  More Actions
                </MenuToggle>
              }
              popper={
                <Menu ref={menuRef}>
                  <MenuContent>
                    <MenuList>
                      <MenuItem>Rename</MenuItem>
                      <MenuItem>Duplicate</MenuItem>
                      <MenuItem>Archive</MenuItem>
                    </MenuList>
                  </MenuContent>
                </Menu>
              }
              isVisible={isMenuOpen}
            />
          </CardBody>
        </Card>

        {isDrawerOpen && (
          <div
            className="custom-drawer"
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              width: '400px',
              height: '100%',
              background: '#fff',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.2)',
              padding: '24px',
            }}
          >
            <h2>Drawer Content</h2>
            <p>This drawer does not receive focus on open.</p>
            <input type="text" placeholder="Search..." />
            <button onClick={() => setIsDrawerOpen(false)}>Close</button>
          </div>
        )}

        {isOverlayOpen && (
          <div
            className="custom-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              className="custom-modal"
              style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '8px',
                minWidth: '400px',
              }}
            >
              <h2>Confirm Action</h2>
              <p>Are you sure you want to proceed?</p>
              <button onClick={() => setIsOverlayOpen(false)}>Confirm</button>
              <button onClick={() => setIsOverlayOpen(false)}>Cancel</button>
            </div>
          </div>
        )}

        {isPopoverOpen && (
          <div
            className="custom-popover"
            style={{
              position: 'absolute',
              background: '#fff',
              border: '1px solid #ccc',
              padding: '16px',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <p>Additional details here.</p>
            <button
              onClick={() => {
                setIsPopoverOpen(false);
                document.body.focus();
              }}
            >
              Close
            </button>
          </div>
        )}
      </PageSection>
    </Page>
  );
};

export default DrawerModal;
