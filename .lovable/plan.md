

## Problem

The tracking panel groups desarmes by `serial_number` and displays a single `client_name` from the first record in the group header. However, the same chassis (serial number) can have desarmes for different clients. The current code takes `client_name` from the first desarme found and ignores the rest.

## Solution

1. **Group header**: Instead of showing one client name, show all unique client names for that serial number (e.g., "FULANO, MENGANO") or remove client name from the header entirely.

2. **Part rows**: Add the client name to each individual part row so it's always clear which client each desarme belongs to.

### Changes in `src/components/desarmes/TrackingPanel.tsx`

- Modify `MachineGroup` interface: replace `client_name: string` with `client_names: string[]` (unique list).
- In the grouping logic, collect unique client names per group.
- In the group header, display all unique client names joined by comma.
- In each part row, display `part.client_name` so the client is visible per desarme.

This is a single-file change affecting only the presentation logic in `TrackingPanel.tsx`.

