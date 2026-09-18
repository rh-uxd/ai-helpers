# Fixture Design -- User Management Table

Task context: Admin manages a list of users with filtering, bulk actions, and inline editing.

Design rationale: Research showed admins spend 60% of their time filtering by role, so the filter toolbar is prominent. User interviews indicated confusion around bulk delete -- a confirmation modal was added.

## Screen: User List

- Page title: "User Management"
- Toolbar: text input for name search, dropdown select for role filter (Admin, Editor, Viewer), "Add User" primary button
- Data table: columns for Name, Email, Role, Status (Active/Inactive), Last Login, Actions
- Table supports row selection via checkboxes for bulk actions
- Bulk action toolbar appears when rows are selected: "Delete Selected" danger button, "Change Role" secondary button
- Pagination below table: 10/20/50 per page selector, page navigation
- Each row has an actions kebab menu: Edit, Deactivate, Delete
- Inline editing: clicking a role cell opens a dropdown to change role in place
- Empty state: illustration with "No users found" message and "Add User" button
- Error state: alert banner above the table when user list fails to load

## Screen: Delete Confirmation Modal

- Title: "Delete users?"
- Body: "Are you sure you want to delete {count} users? This action cannot be undone."
- Buttons: "Cancel" (secondary), "Delete" (danger)
- Focus traps within modal when open
