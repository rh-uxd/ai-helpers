import React from 'react';
import {
  Page,
  PageSection,
  PageSidebar,
  PageSidebarBody,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Button,
  Nav,
  NavList,
  NavItem,
  Title,
} from '@patternfly/react-core';

interface WorkloadsPageProps {
  activeItem: string;
  onSelect: (itemId: string) => void;
  onCreate: () => void;
}

/** Correct Structure — negative control: valid Page / Nav / Toolbar / Card hierarchies. */
export const WorkloadsPage: React.FC<WorkloadsPageProps> = ({
  activeItem,
  onSelect,
  onCreate,
}) => {
  const sidebar = (
    <PageSidebar isSidebarOpen>
      <PageSidebarBody>
        <Nav
          onSelect={(_event, result) => onSelect(String(result.itemId))}
          aria-label="Workloads navigation"
        >
          <NavList>
            <NavItem itemId="pods" to="/pods" isActive={activeItem === 'pods'}>
              Pods
            </NavItem>
            <NavItem
              itemId="deployments"
              to="/deployments"
              isActive={activeItem === 'deployments'}
            >
              Deployments
            </NavItem>
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <Page sidebar={sidebar}>
      <PageSection>
        <Title headingLevel="h1">Workloads</Title>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Button variant="primary" onClick={onCreate}>
                Create
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>
      <PageSection isFilled>
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardBody>All workloads are healthy.</CardBody>
        </Card>
      </PageSection>
    </Page>
  );
};
