# Test Matrix

## P0 smoke every release

1. login
2. dashboard load
3. create customer
4. create deal
5. move deal stage
6. create task
7. complete task
8. run search
9. start import
10. review import
11. commit import
12. open reports
13. invite teammate
14. role restriction check

## Backend regression packs

### auth/core
- token issue/refresh/revoke
- request context
- idempotency on write endpoints

### customers/deals/tasks/activities
- owner enforcement
- audit creation
- filtering and searchability

### imports/spreadsheets
- malformed file
- low confidence mapping
- duplicate row strategy
- sync conflict strategy
- export parity basic assertions

### automations/notifications
- duplicate event delivery
- disabled automation guard
- failure retry handling

### organizations/permissions
- cross-org access denied
- manager vs agent vs admin boundaries

## Frontend regression packs

- route guards
- loading/error/empty states
- mobile navigation
- command palette opening and action routing
- destructive action confirmation flows

## Manual high-risk checks

- very large spreadsheet import
- flaky network while saving entity
- multi-user concurrent edits on deal/task
- locale/currency/date formatting around KZT and multilingual UI
