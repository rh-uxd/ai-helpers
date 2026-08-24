# PROJ-412: Per-user mute for email notifications

**Type:** Story | **Status:** To Do | **Priority:** High
**Link:** https://issues.example.com/browse/PROJ-412
**Component:** Notification Settings
**Labels:** notifications, settings

## Description

The notification settings page currently saves a single global preference.
Turning email alerts off disables them for every event type. Customers want
to mute email for a specific event type (for example, "host went down")
without turning off in-app notifications for that event.

The mute must persist per user via the notifications API. Existing global
email on/off behavior should remain the default for users who have never
set a mute.

## Acceptance Criteria

- A user can mute email for an individual event type from Notification Settings
- In-app notifications for that event type still appear
- Mute state is stored per user and survives reload
- Users with no mute record keep the current global email preference

## Linked issues

- PROJ-380: Notification settings redesign (related)
