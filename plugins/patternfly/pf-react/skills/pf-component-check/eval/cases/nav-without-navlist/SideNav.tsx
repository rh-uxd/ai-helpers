import React from 'react';
import { Nav, NavItem } from '@patternfly/react-core';

interface SideNavProps {
  activeItem: string;
  onSelect: (itemId: string) => void;
}

/** Invalid: NavItem must be under NavList (or inside NavGroup), not directly under Nav. */
export const SideNav: React.FC<SideNavProps> = ({ activeItem, onSelect }) => (
  <Nav
    onSelect={(_event, result) => onSelect(String(result.itemId))}
    aria-label="Side navigation"
  >
    <NavItem itemId="overview" to="/overview" isActive={activeItem === 'overview'}>
      Overview
    </NavItem>
    <NavItem itemId="workloads" to="/workloads" isActive={activeItem === 'workloads'}>
      Workloads
    </NavItem>
    <NavItem itemId="settings" to="/settings" isActive={activeItem === 'settings'}>
      Settings
    </NavItem>
  </Nav>
);
