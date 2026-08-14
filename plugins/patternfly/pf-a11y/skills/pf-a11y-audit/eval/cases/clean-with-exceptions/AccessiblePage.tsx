import React, { useState } from "react";
import {
  Page,
  PageSection,
  Nav,
  NavList,
  NavItem,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  TextInput,
  Alert,
  AlertGroup,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  Tooltip,
  Pagination,
} from "@patternfly/react-core";
import { Table, Thead, Tr, Th, Tbody, Td, Caption } from "@patternfly/react-table";
import { TrashIcon } from "@patternfly/react-icons";

const AccessiblePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  return (
    <Page>
      <Nav aria-label="Main navigation">
        <NavList>
          <NavItem>Dashboard</NavItem>
          <NavItem>Settings</NavItem>
        </NavList>
      </Nav>

      <Nav aria-label="Footer links">
        <NavList>
          <NavItem>Help</NavItem>
          <NavItem>Contact</NavItem>
        </NavList>
      </Nav>

      <PageSection>
        {/* Decorative image — correctly hidden */}
        <img src="/decorative-divider.svg" alt="" aria-hidden="true" />

        {/* Select manages aria-expanded internally — consumer should NOT add it */}
        <Select
          isOpen={isSelectOpen}
          onOpenChange={setIsSelectOpen}
          toggle={(toggleRef) => (
            <MenuToggle ref={toggleRef} onClick={() => setIsSelectOpen(!isSelectOpen)}>
              Filter by status
            </MenuToggle>
          )}
        >
          <SelectList>
            <SelectOption value="active">Active</SelectOption>
            <SelectOption value="inactive">Inactive</SelectOption>
          </SelectList>
        </Select>

        {/* Icon button with proper aria-label and tooltip */}
        <Tooltip content="Delete deployment" aria="none" aria-live="off">
          <Button variant="plain" aria-label="Delete deployment">
            <TrashIcon />
          </Button>
        </Tooltip>

        {/* Table with caption as accessible name */}
        <Table aria-label="Deployment inventory">
          <Caption>Deployment inventory</Caption>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Region</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td dataLabel="Name">prod-east</Td>
              <Td dataLabel="Region">us-east-1</Td>
            </Tr>
          </Tbody>
        </Table>

        {/* Single pagination — no duplicate label issue */}
        <Pagination
          itemCount={100}
          perPage={10}
          page={1}
          aria-label="Deployment list pagination"
        />

        {/* Dynamic alerts with live region */}
        <AlertGroup isLiveRegion>
          <Alert title="Deployment successful" variant="success" />
        </AlertGroup>

        {/* Properly labeled form */}
        <FormGroup label="Deployment name" isRequired fieldId="deploy-name">
          <TextInput id="deploy-name" isRequired />
        </FormGroup>

        {/* Modal with accessible name */}
        <Modal
          aria-labelledby="confirm-modal-title"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        >
          <ModalHeader title="Confirm deletion" labelId="confirm-modal-title" />
          <ModalBody>Are you sure you want to delete this deployment?</ModalBody>
          <ModalFooter>
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
          </ModalFooter>
        </Modal>

        {/* Element with role="presentation" — valid, should not flag */}
        <div role="presentation">
          <span>Visual separator</span>
        </div>
      </PageSection>
    </Page>
  );
};

export default AccessiblePage;
