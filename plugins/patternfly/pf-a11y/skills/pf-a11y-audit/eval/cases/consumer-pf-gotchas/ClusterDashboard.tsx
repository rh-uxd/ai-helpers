import React, { useState } from "react";
import {
  Page,
  PageSection,
  Nav,
  NavList,
  NavItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Button,
  Alert,
  AlertGroup,
  Pagination,
  ClipboardCopy,
} from "@patternfly/react-core";
import { Table, Thead, Tr, Th, Tbody, Td } from "@patternfly/react-table";
import { TrashIcon, EditIcon } from "@patternfly/react-icons";

const ClusterDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<string[]>([]);

  return (
    <Page>
      <Nav>
        <NavList>
          <NavItem>Clusters</NavItem>
          <NavItem>Settings</NavItem>
        </NavList>
      </Nav>

      <Nav>
        <NavList>
          <NavItem>Documentation</NavItem>
          <NavItem>Support</NavItem>
        </NavList>
      </Nav>

      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <Table>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>prod-east-1</Td>
              <Td>Running</Td>
              <Td>
                <Button variant="plain"><TrashIcon /></Button>
                <Button variant="plain"><EditIcon /></Button>
              </Td>
            </Tr>
          </Tbody>
        </Table>

        <Pagination itemCount={100} perPage={10} page={1} />
        <Pagination itemCount={50} perPage={10} page={1} />

        <ClipboardCopy>https://api.cluster-east.example.com</ClipboardCopy>
        <ClipboardCopy>https://api.cluster-west.example.com</ClipboardCopy>

        <AlertGroup>
          {alerts.map((msg, i) => (
            <Alert key={i} title={msg} variant="info" />
          ))}
        </AlertGroup>
      </PageSection>
    </Page>
  );
};

export default ClusterDashboard;
