import React, { useState } from 'react';
import {
  MenuToggle,
  Menu,
  MenuContent,
  MenuList,
  MenuItem,
  Popper,
} from '@patternfly/react-core';

interface ActionMenuProps {
  actions: Array<{ label: string; onClick: () => void; isDisabled?: boolean }>;
  toggleLabel?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  actions,
  toggleLabel = 'Actions',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (
    _event: React.MouseEvent | undefined,
    itemId: string | number | undefined
  ) => {
    const action = actions[Number(itemId)];
    action?.onClick();
    setIsOpen(false);
    toggleRef.current?.focus();
  };

  const toggle = (
    <MenuToggle
      ref={toggleRef}
      onClick={onToggleClick}
      isExpanded={isOpen}
    >
      {toggleLabel}
    </MenuToggle>
  );

  const menu = (
    <Menu ref={menuRef} onSelect={onSelect}>
      <MenuContent>
        <MenuList>
          {actions.map((action, index) => (
            <MenuItem
              key={action.label}
              itemId={index}
              isDisabled={action.isDisabled}
            >
              {action.label}
            </MenuItem>
          ))}
        </MenuList>
      </MenuContent>
    </Menu>
  );

  return (
    <Popper
      trigger={toggle}
      popper={menu}
      isVisible={isOpen}
      appendTo={() => document.body}
    />
  );
};
