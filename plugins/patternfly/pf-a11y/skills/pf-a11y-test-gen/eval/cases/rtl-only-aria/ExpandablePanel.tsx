import React, { useState } from 'react';
import {
  Button,
  ExpandableSection,
  TextContent,
  Text,
} from '@patternfly/react-core';

interface ExpandablePanelProps {
  title: string;
  children: React.ReactNode;
  onToggle?: (isExpanded: boolean) => void;
  defaultExpanded?: boolean;
}

export const ExpandablePanel: React.FC<ExpandablePanelProps> = ({
  title,
  children,
  onToggle,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = (_event: React.MouseEvent, expanded: boolean) => {
    setIsExpanded(expanded);
    onToggle?.(expanded);
  };

  return (
    <div>
      <ExpandableSection
        toggleText={title}
        onToggle={handleToggle}
        isExpanded={isExpanded}
      >
        <TextContent>
          <Text>{children}</Text>
        </TextContent>
      </ExpandableSection>
      <Button variant="link" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </Button>
    </div>
  );
};
