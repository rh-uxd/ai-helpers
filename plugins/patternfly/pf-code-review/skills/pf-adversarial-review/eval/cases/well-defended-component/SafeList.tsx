import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@patternfly/react-table';
import {
  EmptyState,
  EmptyStateBody,
  Spinner,
  Alert,
  Truncate,
} from '@patternfly/react-core';

interface Item {
  id: string;
  name: string;
  description?: string;
  metadata?: { owner?: string };
}

interface SafeListProps {
  items?: Item[];
  isLoading?: boolean;
  error?: string;
  onSelect?: (item: Item) => void;
}

export const SafeList: React.FC<SafeListProps> = ({
  items = [],
  isLoading = false,
  error,
  onSelect,
}) => {
  if (isLoading) {
    return <Spinner aria-label="Loading items" />;
  }

  if (error) {
    return <Alert variant="danger" title="Failed to load items">{error}</Alert>;
  }

  if (items.length === 0) {
    return (
      <EmptyState titleText="No items found">
        <EmptyStateBody>
          No items match your current filters.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Table aria-label="Items list">
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Description</Th>
          <Th>Owner</Th>
        </Tr>
      </Thead>
      <Tbody>
        {items.map((item) => (
          <Tr
            key={item.id}
            onRowClick={() => onSelect?.(item)}
            isClickable={Boolean(onSelect)}
          >
            <Td dataLabel="Name">
              <Truncate content={item.name} />
            </Td>
            <Td dataLabel="Description">
              {item.description ?? 'No description'}
            </Td>
            <Td dataLabel="Owner">
              {item.metadata?.owner ?? 'Unassigned'}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
