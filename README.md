# electricLines

A multi-level electric wiring simulation that uses genetic algorithms and Minimum Spanning Trees (MST) to optimize cable routing across a 3D-stacked grid.

## Overview

`electricLines` solves the problem of connecting multiple voltage providers to distributed endpoints across several physical levels. It minimizes total cable length and wire crossings by evolving optimal positions for vertical risers and intermediate Steiner points.

### Core Technologies
- **Nuxt 4 / Vue 3**: Frontend framework and reactive state management.
- **Tailwind CSS**: UI styling and layout.
- **TypeScript**: Type-safe simulation logic.

## Technical Mechanics

### Genetic Algorithm (GA)
The simulation evolves a population of potential solutions. Each individual's genome consists of:
- **Riser Positions**: X/Y coordinates for vertical shafts that carry all voltages between levels.
- **Steiner Points**: Randomly evolved intermediate nodes to allow for non-direct MST routing.
- **Segment Orientations**: Boolean flags determining the L-shape bend direction for Manhattan-distance paths.

### Fitness Function
The GA optimizes based on a weighted penalty system:
- **Cable Length**: Total Manhattan distance of all wire segments.
- **Crossings**: High penalty for wires of different voltages intersecting on the same level.
- **Riser Efficiency**: Penalties for risers placed too close to each other or overlapping with components.

### Routing Logic
For every level and voltage type, the system:
1. Identifies required connections (Providers $\to$ Endpoints $\to$ Risers).
2. Computes a **Minimum Spanning Tree (MST)** using Prim's algorithm to connect all points.
3. Renders the resulting tree using Manhattan-style paths with evolved orientations.

## Capabilities

- **Multi-Level Simulation**: Manage wiring across up to 5 stacked levels (A-E).
- **Voltage Separation**: Independent routing for 3.3V, 5V, 12V, and 24V lines.
- **Real-time Evolution**: Watch the GA progress as it reduces cost, length, and collisions.
- **Manual/Auto Placement**: Add specific providers and endpoints or generate random stress tests.

## Installation

### Prerequisites
- Node.js (Latest LTS recommended)
- npm, pnpm, or bun

### Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### Production

Build and preview the production bundle:
```bash
npm run build
npm run preview
```
