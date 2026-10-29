# QR Code Management Expansion

Extending the existing QR code management system to include individual plants, allowing admins to generate, track, and download QR codes for every plant in the garden.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were selected based on recommended defaults as the interactive questions were dismissed.

- **UI Layout**: A tabbed interface (Areas vs. Plants) will be used to maintain organization as the number of plants grows.
- **Card Details**: Plant QR cards will display the Common Name, Scientific Name, and real-time Scan Count.
- **Bulk Actions**: A "Download All" feature will be added to export all QR codes in the current view as high-resolution PNGs.

## 1. Overview & Core Concept

- **What It Does**: Admins can now manage QR codes for both high-level garden areas (e.g., "Main Lawn") and specific plants (e.g., "Hibiscus rosa-sinensis").
- **Target Audience**: Garden administrators and maintenance staff.
- **Key Value**: Enables per-plant engagement tracking and simplifies the physical labeling process with ready-to-print QR codes.

## 2. User Experience & Visual Design

- **Navigation**:
  - Two primary tabs at the top: **Garden Areas** and **Plants**.
  - A persistent search bar that filters the current active tab.
- **Plant QR Cards**:
  - **Visuals**: Large QR code preview in a clean stone-colored container.
  - **Metadata**: Common name as the primary title, scientific name in emerald-accented text.
  - **Stats**: Total scan count badge.
  - **Actions**: Copy URL, Individual Download, and Print.
- **Bulk Export**:
  - A prominent "Download All" button appears next to the search bar to export the filtered set of QR codes.

## 3. Key Product Decisions & Trade-Offs

- **Routing Logic**:
  - Area QR codes continue to use the `/scan/:code` proxy for tracking.
  - Plant QR codes will link directly to `${publicBaseUrl}/plant/${plantId}`, as the `recordScan` utility handles tracking on the detail page itself.
- **Performance**:
  - Subscriptions are limited to recent scans to ensure the UI remains responsive even with thousands of data points.

## 4. Technical Architecture & Data Strategy

```unicode
┌─────────────────────────────────────────────────────────┐
│                   AdminQRCodes Page                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐       ┌────────────────────────────┐  │
│  │    State     │ <───> │   Subscriptions (Sync)     │  │
│  │ (Tabs, Search)│       │ (Plants, Areas, Scans)     │  │
│  └──────────────┘       └────────────────────────────┘  │
│          │                                              │
│          ▼                                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │                 Filtered Data Set                 │  │
│  └───────────────────────────────────────────────────┘  │
│          │                                              │
│    ┌─────┴───────────────────────────────┐              │
│    ▼                                     ▼              │
│ ┌──────────────────┐           ┌──────────────────┐     │
│ │   Area Cards     │           │   Plant Cards    │     │
│ └──────────────────┘           └──────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

- **Data Flow**:
  1. `subscribeToPlants` and `subscribeToAreas` fetch the core entities.
  2. `subscribeToScans` (limited to 100) provides real-time activity context.
  3. The page aggregates `scans` by `plantId` or `areaId` to display counts.
  4. `QRCodeSVG` renders the actual codes using the base public URL.
