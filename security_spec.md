# Security Specification - Smart Garden

## Data Invariants
1.  **Gardens**: Top-level entity. Code must be unique (enforced by logic, verified by rules if possible, but Firestore doesn't have unique constraints easily in rules).
2.  **Areas**: Must belong to a valid Garden.
3.  **Plants**: Must belong to a valid Category.
4.  **Markers**: Must link a valid Area and a valid Plant.
5.  **Admins**: Only users explicitly added to the `admins` collection can write data.

## The Dirty Dozen (Vulnerability Payloads)
1.  **Identity Spoofing**: Attempt to write a garden as a non-authenticated user. (REJECTED)
2.  **Privilege Escalation**: Attempt to add a user to the `admins` collection as a non-admin. (REJECTED)
3.  **Orphaned Area**: Create an Area with a non-existent `gardenId`. (REJECTED via `exists()`)
4.  **Orphaned Plant**: Create a Plant with a non-existent `categoryId`. (REJECTED via `exists()`)
5.  **State Poisoning**: Update a plant with a `status` that is not "active" or "inactive". (REJECTED via `enum`)
6.  **Volumetric Attack**: Attempt to save a plant description that is 2MB. (REJECTED via `.size()`)
7.  **ID Injection**: Attempt to create a document with an ID containing symbols like `../`. (REJECTED via `isValidId`)
8.  **Unauthorized List Scrape**: Attempt to list `admins` collection as a non-admin. (REJECTED)
9.  **PII Leak**: Attempt to read admin emails if they were stored (isolation strategy). (N/A yet but planned)
10. **Shadow Field**: Create a plant with an extra field `isVerifiedBySystem: true`. (REJECTED via `hasOnly()`)
11. **Timestamp Spoofing**: Provide a custom `createdAt` time instead of server time. (REJECTED via `request.time`)
12. **Malicious Marker**: Create a marker with coordinates `x: 500, y: -20`. (REJECTED via boundary checks)

## Access Matrix
| Collection | Read | Create | Update | Delete |
| :--- | :--- | :--- | :--- | :--- |
| gardens | Public | Admin | Admin | Admin |
| areas | Public | Admin | Admin | Admin |
| plants | Public | Admin | Admin | Admin |
| categories | Public | Admin | Admin | Admin |
| markers | Public | Admin | Admin | Admin |
| admins | Admin | None* | None* | None* |

*Initial admin bootstrap required.
