import React, { useState } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@patternfly/react-table';
import {
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  Pagination,
  Tabs,
  Tab,
  TabTitleText,
} from '@patternfly/react-core';

interface Order {
  id: string;
  product: string;
  quantity: number;
  status: string;
}

interface OrderTableProps {
  orders: Order[];
}

export const OrderTable: React.FC<OrderTableProps> = ({ orders }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterValue, setFilterValue] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);

  const filteredOrders = orders.filter((o) =>
    filterValue ? o.status === filterValue : true
  );

  return (
    <>
      <Tabs activeKey={activeTab} onSelect={(_e, key) => setActiveTab(key as number)}>
        <Tab eventKey={0} title={<TabTitleText>All Orders</TabTitleText>}>
          <Select
            isOpen={isFilterOpen}
            onOpenChange={setIsFilterOpen}
            toggle={(toggleRef) => (
              <MenuToggle ref={toggleRef} onClick={() => setIsFilterOpen(!isFilterOpen)}>
                {filterValue || 'Filter by status'}
              </MenuToggle>
            )}
          >
            <SelectList>
              <SelectOption value="pending">Pending</SelectOption>
              <SelectOption value="shipped">Shipped</SelectOption>
              <SelectOption value="delivered">Delivered</SelectOption>
            </SelectList>
          </Select>

          <Table aria-label="Orders">
            <Thead>
              <Tr>
                <Th>Order ID</Th>
                <Th>Product</Th>
                <Th>Quantity</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredOrders.map((order) => (
                <Tr key={order.id}>
                  <Td>{order.id}</Td>
                  <Td>{order.product}</Td>
                  <Td>{order.quantity}</Td>
                  <Td>{order.status}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Pagination
            itemCount={filteredOrders.length}
            perPage={10}
            page={1}
          />
        </Tab>
        <Tab eventKey={0} title={<TabTitleText>Pending</TabTitleText>}>
          <p>Pending orders view</p>
        </Tab>
      </Tabs>
    </>
  );
};
