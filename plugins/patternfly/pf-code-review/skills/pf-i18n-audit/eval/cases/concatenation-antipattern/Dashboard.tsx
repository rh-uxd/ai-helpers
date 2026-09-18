import React from 'react';
import { Card, CardTitle, CardBody, Title } from '@patternfly/react-core';

interface DashboardProps {
  userName: string;
  itemCount: number;
  lastLogin: Date;
  price: number;
  tags: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  userName,
  itemCount,
  lastLogin,
  price,
  tags,
}) => {
  const greeting = "Welcome back, " + userName + "!";
  const itemSummary = `${itemCount} items found`;
  const dateStr = "Last login: " + lastLogin.toLocaleDateString();
  const priceStr = "$" + price.toFixed(2);
  const tagList = tags.join(", ");

  const timeAgo = "5 minutes ago";

  return (
    <Card>
      <CardTitle>{greeting}</CardTitle>
      <CardBody>
        <Title headingLevel="h3">{itemSummary}</Title>
        <p>{dateStr}</p>
        <p>Total: {priceStr}</p>
        <p>Tags: {tagList}</p>
        <p>Updated {timeAgo}</p>
      </CardBody>
    </Card>
  );
};
