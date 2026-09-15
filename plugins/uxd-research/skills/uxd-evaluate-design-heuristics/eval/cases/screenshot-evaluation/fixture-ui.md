# Dashboard — Cluster Overview

## Navigation sidebar (left, 240 px)

- Logo and product name at top ("OpenShift Console")
- Vertical nav with icon + label for each item:
  Home, Workloads, Networking, Storage, Monitoring, Compute, User Management
- "Monitoring" is the active item (highlighted background, bold label)
- Collapse/expand chevron at bottom of sidebar
- No visible focus indicators on nav items

## Toolbar (top, spanning content area)

- Breadcrumb: Home > Monitoring > Dashboard
- Cluster selector dropdown (reads "production-east-1")
- Time-range filter pill group: 1h | 6h | 24h | 7d | 30d — "24h" is selected
- Namespace multi-select dropdown (placeholder text: "All namespaces")
- Refresh button (icon only, no tooltip)
- Search input, right-aligned, placeholder "Filter by name"

## Summary cards (row of 4 cards below toolbar)

| Card | Value | Trend |
|------|-------|-------|
| Total Pods | 1,247 | +3 % (green arrow up) |
| CPU Utilization | 68 % | flat (grey dash) |
| Memory Utilization | 74 % | +5 % (amber arrow up) |
| Alerts Firing | 3 | red badge, no trend |

- Cards use `Card` component, equal width, 16 px gap
- Values are 32 px bold; labels are 14 px regular, grey
- "Alerts Firing" card has a red left-border accent
- No empty-state treatment visible if values were zero

## Data table (main content area)

- Columns: Name, Status, Namespace, CPU (cores), Memory (MiB), Restarts, Age
- 25 rows visible; pagination control at bottom (1–25 of 312)
- Sortable columns indicated by caret icons; sorted by "CPU" descending
- Status column uses colored dot: green = Running, yellow = Pending, red = Error
- Row hover highlights entire row in light blue
- No bulk-select checkboxes
- Compact row density; 12 px font
- Truncated pod names with ellipsis; no tooltip on hover to show full name
- Empty "Restarts" cells show "0" rather than a dash or blank
