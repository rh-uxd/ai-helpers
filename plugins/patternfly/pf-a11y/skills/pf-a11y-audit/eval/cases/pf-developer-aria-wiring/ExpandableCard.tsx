import React, { useState } from "react";

export interface ExpandableCardProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({
  title,
  children,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="pf-v6-c-card">
      <div className="pf-v6-c-card__header">
        <button
          className="pf-v6-c-card__header-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {title}
        </button>
      </div>
      {isExpanded && (
        <div className="pf-v6-c-card__body">{children}</div>
      )}
    </div>
  );
};

export default ExpandableCard;
