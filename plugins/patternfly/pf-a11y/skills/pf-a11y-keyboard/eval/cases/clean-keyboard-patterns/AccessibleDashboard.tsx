import React, { useState } from 'react';
import {
  Page,
  Masthead,
  MastheadMain,
  MastheadBrand,
  MastheadContent,
  PageSection,
  SkipToContent,
  Nav,
  NavList,
  NavItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Button,
  Modal,
  ModalVariant,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Card,
  CardTitle,
  CardBody,
} from '@patternfly/react-core';

const AccessibleDashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const skipToContent = (
    <SkipToContent href="#main-content">Skip to main content</SkipToContent>
  );

  return (
    <Page skipToContent={skipToContent} mainContainerId="main-content">
      <Masthead>
        <MastheadMain>
          <MastheadBrand>My App</MastheadBrand>
        </MastheadMain>
        <MastheadContent>
          <Nav aria-label="Global navigation">
            <NavList>
              <NavItem itemId={0} isActive>Dashboard</NavItem>
              <NavItem itemId={1}>Settings</NavItem>
              <NavItem itemId={2}>Reports</NavItem>
            </NavList>
          </Nav>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem>
                <Dropdown
                  isOpen={isDropdownOpen}
                  onSelect={() => setIsDropdownOpen(false)}
                  onOpenChange={setIsDropdownOpen}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      ref={toggleRef}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      Actions
                    </MenuToggle>
                  )}
                >
                  <DropdownList>
                    <DropdownItem key="edit">Edit</DropdownItem>
                    <DropdownItem key="delete">Delete</DropdownItem>
                  </DropdownList>
                </Dropdown>
              </ToolbarItem>
              <ToolbarItem>
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  Create item
                </Button>
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        </MastheadContent>
      </Masthead>

      <PageSection id="main-content">
        <Card>
          <CardTitle>Welcome</CardTitle>
          <CardBody>Dashboard content goes here.</CardBody>
        </Card>
      </PageSection>

      <Modal
        variant={ModalVariant.small}
        title="Create new item"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <p>Modal content with focus trap managed by PatternFly.</p>
        <Button variant="primary" onClick={() => setIsModalOpen(false)}>
          Confirm
        </Button>
        <Button variant="link" onClick={() => setIsModalOpen(false)}>
          Cancel
        </Button>
      </Modal>
    </Page>
  );
};

export default AccessibleDashboard;
