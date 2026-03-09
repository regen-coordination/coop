# Coop Canvas Feature & Design System Overhaul

**Version**: 1.0  
**Date**: March 8, 2026  
**Status**: Planning Phase  
**Scope**: Canvas feature + Atomic Design System + Responsive UI

---

## Executive Summary

This plan introduces a **visual canvas interface** using ReactFlow for managing Coop knowledge as interactive nodes, alongside a complete **atomic design system** overhaul to make the UI sleek, attractive, and properly componentized. 

**Key Deliverables:**
1. **Canvas Feature**: ReactFlow-based infinite canvas for visual knowledge mapping
2. **Atomic Design System**: 5-tier component architecture (Atoms → Molecules → Organisms → Templates → Pages)
3. **Responsive Design**: Mobile-first approach with adaptive layouts
4. **Theme System**: Centralized design tokens (colors, spacing, typography)
5. **Component Library**: 30+ reusable, documented components

---

## Part 1: Canvas Feature Architecture

### 1.1 Canvas Concept & User Flow

**What is the Canvas?**
An infinite, zoomable, pannable workspace where Coop members can:
- Visualize captured content as interactive nodes
- Connect related items with relationship edges
- Organize knowledge spatially (clusters, flows, timelines)
- Collaborate in real-time (see other users' cursors)

**User Flow:**
```
1. Open Side Panel → Click "Canvas" tab
2. See all captured items as floating nodes
3. Drag to organize → Connect related items
4. Create clusters/groups (e.g., "Q1 Impact", "Funding Ideas")
5. Add AI-generated insights as suggestion nodes
6. Export canvas as image or interactive link
```

### 1.2 ReactFlow Implementation Strategy

**Library Selection**: `@xyflow/react` (ReactFlow v12+)

**Why ReactFlow?**
- Battle-tested in production (used by Stripe, Linear, etc.)
- Excellent performance with large node counts
- Built-in zoom, pan, minimap, controls
- Custom node/edge support
- TypeScript-first
- Active community & maintenance

**Canvas Node Types:**

| Node Type | Purpose | Data Structure |
|-----------|---------|----------------|
| `CaptureNode` | Tab captures, voice notes | `{ type: 'capture', sourceType: 'tab' \| 'voice', content, metadata }` |
| `InsightNode` | AI-generated insights | `{ type: 'insight', pillar, summary, actions, confidence }` |
| `ClusterNode` | Grouped items container | `{ type: 'cluster', label, itemIds[], color }` |
| `ActionNode` | Todo/action items | `{ type: 'action', text, status, assignee }` |
| `EvidenceNode` | Supporting links/files | `{ type: 'evidence', url, title, preview }` |
| `MetricNode` | Quantifiable data points | `{ type: 'metric', value, unit, trend }` |
| `CommentNode` | Threaded discussions | `{ type: 'comment', text, author, replies[] }` |

**Canvas Edge Types:**

| Edge Type | Relationship | Style |
|-----------|--------------|-------|
| `relates-to` | Generic connection | Solid gray line |
| `supports` | Evidence → Claim | Solid green line |
| `contradicts` | Opposing evidence | Dashed red line |
| `implements` | Action → Goal | Solid blue line |
| `references` | Link to source | Dotted line |
| `sequence` | Temporal flow | Arrow line |

### 1.3 Canvas State Management

**Zustand Store Structure:**
```typescript
interface CanvasState {
  // Nodes & Edges
  nodes: Node<CanvasNodeData>[];
  edges: Edge<CanvasEdgeData>[];
  
  // Viewport
  viewport: { x: number; y: number; zoom: number };
  
  // Selection
  selectedNodes: string[];
  selectedEdges: string[];
  
  // Collaboration
  remoteCursors: Map<string, Cursor>; // userId → position
  
  // History (for undo/redo)
  history: CanvasSnapshot[];
  historyIndex: number;
  
  // Actions
  addNode: (node: Node) => void;
  updateNode: (id: string, data: Partial<CanvasNodeData>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;
  setViewport: (viewport: Viewport) => void;
  undo: () => void;
  redo: () => void;
  autoLayout: (algorithm: 'force' | 'hierarchical' | 'grid') => void;
}
```

**Persistence Strategy:**
- Canvas state syncs to anchor node via WebSocket
- Local backup in IndexedDB for offline editing
- Optimistic UI updates with server reconciliation

### 1.4 Canvas Component Architecture

```
packages/extension/src/
  canvas/
    CanvasView.tsx              # Main canvas container
    CanvasProvider.tsx          # ReactFlow provider + state
    components/
      nodes/
        CaptureNode.tsx         # Tab/voice capture display
        InsightNode.tsx         # AI insight card
        ClusterNode.tsx         # Group container
        ActionNode.tsx          # Todo item
        EvidenceNode.tsx        # Link preview
        MetricNode.tsx          # Data visualization
        CommentNode.tsx         # Discussion thread
        NodeHandle.tsx          # Connection points
      edges/
        CustomEdge.tsx          # Styled connection lines
        EdgeLabel.tsx           # Relationship labels
      controls/
        MiniMap.tsx             # Overview map
        Controls.tsx            # Zoom/fit controls
        Toolbar.tsx             # Add node tools
        LayoutMenu.tsx          # Auto-layout options
      overlays/
        RemoteCursors.tsx       # Other users' cursors
        GridBackground.tsx      # Dot/grid pattern
        SelectionBox.tsx        # Multi-select visual
    hooks/
      useCanvasState.ts         # Zustand store hook
      useNodeInteractions.ts    # Drag/resize/click handlers
      useCollaboration.ts       # Real-time sync
      useCanvasHistory.ts       # Undo/redo
    utils/
      layoutAlgorithms.ts       # Force-directed, hierarchical
      nodeFactories.ts          # Create nodes from captures
      edgeValidators.ts         # Prevent invalid connections
      canvasExport.ts         # PNG/SVG export
```

### 1.5 Canvas Features by Phase

**Phase 1: Basic Canvas (MVP)**
- [ ] Infinite canvas with zoom/pan
- [ ] Auto-generate nodes from feed items
- [ ] Manual drag-to-organize
- [ ] Basic connections (edges)
- [ ] Mini-map navigation
- [ ] Export as PNG

**Phase 2: Smart Canvas**
- [ ] AI-suggested layouts
- [ ] Auto-cluster by topic/pillar
- [ ] Insight nodes (AI analysis results)
- [ ] Group/cluster nodes
- [ ] Edge labels (relationship types)
- [ ] Search & filter nodes

**Phase 3: Collaborative Canvas**
- [ ] Real-time multi-user cursors
- [ ] Live node editing
- [ ] Presence indicators
- [ ] Conflict resolution
- [ ] Canvas versioning/history

**Phase 4: Advanced Canvas**
- [ ] Custom node types (plugins)
- [ ] Templates (SWOT, Timeline, Journey)
- [ ] Embed external content (Figma, Miro)
- [ ] Presentation mode
- [ ] Analytics overlay (coverage, gaps)

---

## Part 2: Atomic Design System

### 2.1 Design Philosophy

**Atomic Design Methodology** (Brad Frost):
```
Atoms → Molecules → Organisms → Templates → Pages
```

**Benefits for Coop:**
- **Consistency**: Same button everywhere
- **Maintainability**: Change atom → updates everywhere
- **Scalability**: Build complex UIs from simple pieces
- **Documentation**: Clear component hierarchy
- **Testing**: Test atoms in isolation

### 2.2 Component Hierarchy

#### **Level 1: Atoms** (Foundational building blocks)
```
packages/shared/src/components/atoms/
  Color/
    ColorPalette.tsx          # Color swatches
    ColorToken.tsx            # Named color display
  Typography/
    Text.tsx                  # All text variants
    Heading.tsx               # H1-H6 components
    Label.tsx                 # Form labels
  Spacing/
    Box.tsx                   # Spacing primitive
    Stack.tsx                 # Vertical/horizontal stack
    Grid.tsx                  # Grid layout
  Interactive/
    Button.tsx                # Button variants
    IconButton.tsx            # Icon-only button
    Link.tsx                  # Text links
  Input/
    Input.tsx                 # Text input
    TextArea.tsx              # Multi-line input
    Select.tsx                # Dropdown
    Checkbox.tsx              # Boolean toggle
    Switch.tsx                # Toggle switch
  Feedback/
    Badge.tsx                 # Status indicators
    Progress.tsx              # Loading progress
    Spinner.tsx               # Loading spinner
    Skeleton.tsx              # Placeholder loading
  Media/
    Icon.tsx                  # SVG icons
    Avatar.tsx                # User avatars
    Thumbnail.tsx             # Image previews
```

**Atom Specifications:**

**Button Atom:**
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  state: 'default' | 'hover' | 'active' | 'disabled' | 'loading';
  leftIcon?: IconName;
  rightIcon?: IconName;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Text Atom:**
```typescript
interface TextProps {
  variant: 'body' | 'caption' | 'footnote' | 'lead';
  size: 'xs' | 'sm' | 'md' | 'lg';
  weight: 'normal' | 'medium' | 'semibold' | 'bold';
  color: 'primary' | 'secondary' | 'muted' | 'inverse' | 'brand';
  align: 'left' | 'center' | 'right';
  truncate?: boolean;
  children: React.ReactNode;
}
```

#### **Level 2: Molecules** (Simple component groups)
```
packages/shared/src/components/molecules/
  InputGroups/
    InputField.tsx            # Label + Input + Error
    SearchField.tsx           # Search icon + Input + Clear
    SelectField.tsx           # Label + Select + Hint
  Cards/
    Card.tsx                  # Container with padding
    CardHeader.tsx            # Title + actions
    CardBody.tsx              # Content area
    CardFooter.tsx            # Actions row
  Lists/
    ListItem.tsx              # Row with icon + text + action
    ListGroup.tsx             # Bordered list container
  Navigation/
    Tab.tsx                   # Individual tab
    Breadcrumb.tsx            # Path indicator
    Step.tsx                  # Wizard step indicator
  Feedback/
    Alert.tsx                 # Notification banner
    Toast.tsx                 # Floating notification
    EmptyState.tsx            # Zero-content placeholder
  Composites/
    UserInfo.tsx              # Avatar + Name + Role
    Stat.tsx                  # Number + Label + Trend
    Tag.tsx                   # Label + Remove button
    FileUpload.tsx            # Dropzone + Preview
```

**Molecule Example: InputField**
```typescript
interface InputFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement<typeof Input>; // Input atom
}

// Usage:
<InputField label="Display Name" hint="How others see you">
  <Input placeholder="Enter your name" />
</InputField>
```

#### **Level 3: Organisms** (Complex UI sections)
```
packages/extension/src/components/organisms/
  Capture/
    VoiceRecorder.tsx         # Full voice recording UI
    TabCaptureButton.tsx      # Tab capture with preview
    FileDropZone.tsx          # Drag-drop with feedback
  Coop/
    CreateCoopForm.tsx        # Create coop workflow
    JoinCoopForm.tsx           # Join with share code
    ActiveCoopCard.tsx         # Current coop display
    MemberList.tsx            # Coop members roster
  Feed/
    ActivityFeed.tsx          # Scrollable feed container
    FeedItem.tsx              # Individual feed item
    FeedItemActions.tsx       # Process/edit/delete
    FeedFilters.tsx           # Type/date/pillar filters
  Skill/
    PillarSelector.tsx        # 4-pillar selection
    SkillRunner.tsx           # AI processing trigger
    SkillResults.tsx          # Results display
  Canvas/
    CanvasViewport.tsx        # ReactFlow container
    CanvasToolbar.tsx         # Node creation tools
    NodePalette.tsx           # Available node types
    MiniMapOverlay.tsx        # Navigation mini-map
  Status/
    NetworkStatus.tsx         # Online/offline indicator
    ConnectionStatus.tsx      # WebSocket state
    OfflineQueue.tsx          # Pending items display
  Navigation/
    AppHeader.tsx             # Logo + user menu
    TabBar.tsx                # Feed/Canvas/Settings tabs
    Sidebar.tsx               # Collapsible menu
```

#### **Level 4: Templates** (Page layouts)
```
packages/extension/src/components/templates/
  MainLayout.tsx              # Header + Content + Sidebar
  AuthLayout.tsx              # Centered auth forms
  CanvasLayout.tsx            # Full-screen canvas
  SplitLayout.tsx             # Master-detail view
  ModalLayout.tsx             # Overlay containers
```

**Template Example: MainLayout**
```typescript
interface MainLayoutProps {
  header: React.ReactNode;      // AppHeader organism
  sidebar?: React.ReactNode;    // Navigation
  children: React.ReactNode;    // Main content
  footer?: React.ReactNode;     // Status bar
}

// Usage:
<MainLayout
  header={<AppHeader coopName="Garden Project" />}
  sidebar={<TabBar activeTab="feed" />}
  footer={<NetworkStatus online={true} />}
>
  <ActivityFeed items={feedItems} />
</MainLayout>
```

#### **Level 5: Pages** (Full views)
```
packages/extension/src/pages/
  FeedPage.tsx                # Main feed view
  CanvasPage.tsx              # Canvas workspace
  SettingsPage.tsx            # App settings
  CoopPage.tsx                # Coop management
  CapturePage.tsx             # Voice/camera capture
```

### 2.3 Design Tokens (Theme System)

**Centralized in `packages/shared/src/theme/tokens.ts`:**

```typescript
export const tokens = {
  colors: {
    // Brand
    brand: {
      50: '#e8f5e9',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#4caf50',  // Primary
      600: '#43a047',
      700: '#388e3c',
      800: '#2e7d32',
      900: '#1b5e20',
    },
    // Semantic
    success: '#4caf50',
    warning: '#ff9800',
    danger: '#f44336',
    info: '#2196f3',
    // Text
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
      muted: '#999999',
      inverse: '#ffffff',
      link: '#4caf50',
    },
    // Background
    background: {
      page: '#f5f5f5',
      card: '#ffffff',
      elevated: '#fafafa',
      overlay: 'rgba(0,0,0,0.5)',
    },
    // Border
    border: {
      light: '#e0e0e0',
      medium: '#bdbdbd',
      dark: '#9e9e9e',
    },
  },
  
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '32px',
    8: '40px',
    9: '48px',
    10: '64px',
  },
  
  typography: {
    fontFamily: {
      sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',
    },
    sizes: {
      xs: { size: '12px', lineHeight: '16px' },
      sm: { size: '14px', lineHeight: '20px' },
      md: { size: '16px', lineHeight: '24px' },
      lg: { size: '18px', lineHeight: '28px' },
      xl: { size: '20px', lineHeight: '28px' },
      '2xl': { size: '24px', lineHeight: '32px' },
      '3xl': { size: '30px', lineHeight: '36px' },
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.1)',
    inner: 'inset 0 2px 4px rgba(0,0,0,0.06)',
  },
  
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};
```

### 2.4 Component Development Workflow

**1. Design Phase:**
- Create Figma component
- Define props interface
- Write usage examples

**2. Development Phase:**
```bash
# Generate component boilerplate
pnpm generate:component Atom Button

# Creates:
# packages/shared/src/components/atoms/Button/
#   Button.tsx
#   Button.stories.tsx
#   Button.test.tsx
#   Button.module.css (or inline styles)
#   index.ts
```

**3. Testing Phase:**
- Unit tests (Jest/Vitest)
- Visual regression (Storybook + Chromatic)
- Accessibility (axe-core)

**4. Documentation Phase:**
- Storybook story with all variants
- Props table
- Usage examples
- Do/don't guidelines

---

## Part 3: Responsive Design Strategy

### 3.1 Device Targeting

| Device | Width | Usage Context | UI Mode |
|--------|-------|---------------|---------|
| Mobile | 320-480px | PWA, on-the-go capture | Stacked, touch-first |
| Tablet | 768-1024px | Field work, review | Split view possible |
| Desktop Extension | 400px (sidepanel) | While browsing | Compact, focused |
| Desktop Full | 1280px+ | Deep work, canvas | Full-featured |

### 3.2 Responsive Patterns

**Side Panel (400px fixed):**
- Always vertical stack
- Simplified navigation (tabs at bottom)
- Touch-optimized buttons (min 44px)
- Collapsible sections

**PWA (320px+):**
- Mobile: Single column, cards stack
- Tablet: Split view (list + detail)
- Responsive typography (clamp())

**Canvas (adaptive):**
- Mobile: Simplified controls, gesture-based
- Desktop: Full toolbar, context menus

### 3.3 Breakpoint System

```typescript
// Using CSS custom properties
:root {
  --bp-mobile: 480px;
  --bp-tablet: 768px;
  --bp-desktop: 1024px;
}

// React hook for responsive logic
const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('mobile');
  
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 480) setBreakpoint('mobile');
      else if (w < 768) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };
    
    window.addEventListener('resize', check);
    check();
    return () => window.removeEventListener('resize', check);
  }, []);
  
  return breakpoint;
};
```

### 3.4 Responsive Component Examples

**FeedItem (adaptive):**
```tsx
// Mobile: Full width, stacked content
// Tablet: Horizontal with thumbnail
// Desktop: Full metadata visible

const FeedItem = ({ item }) => {
  const bp = useBreakpoint();
  
  return (
    <Card direction={bp === 'mobile' ? 'vertical' : 'horizontal'}>
      {bp !== 'mobile' && <Thumbnail src={item.preview} />}
      <Content>
        <Header>
          <Badge>{item.type}</Badge>
          {bp === 'desktop' && <Timestamp date={item.date} />}
        </Header>
        <Title truncate={bp === 'mobile'}>{item.title}</Title>
        {bp === 'desktop' && <Description>{item.summary}</Description>}
      </Content>
      {bp !== 'mobile' && <Actions collapsed={bp === 'tablet'} />}
    </Card>
  );
};
```

---

## Part 4: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Set up design system infrastructure

- [ ] Install ReactFlow + dependencies
- [ ] Create theme tokens file
- [ ] Set up Storybook for component development
- [ ] Build core atoms (Button, Text, Input, Card)
- [ ] Create component generator script
- [ ] Document design system in Storybook

**Deliverables:**
- Theme tokens implemented
- 10 core atoms with stories
- Component generator working

### Phase 2: Canvas MVP (Weeks 3-4)
**Goal**: Basic canvas functionality

- [ ] Create CanvasView component with ReactFlow
- [ ] Implement CaptureNode type
- [ ] Add auto-generation from feed items
- [ ] Basic drag/zoom/pan
- [ ] Mini-map navigation
- [ ] Simple edge connections
- [ ] Export to PNG

**Deliverables:**
- Canvas tab in side panel
- Nodes generate from captures
- Manual organization works
- Export functional

### Phase 3: Component Migration (Weeks 5-6)
**Goal**: Refactor existing UI to use new system

- [ ] Migrate extension sidepanel to atoms/molecules
- [ ] Refactor PWA with new components
- [ ] Extract shared organisms
- [ ] Implement responsive layouts
- [ ] Add loading states (Skeleton)
- [ ] Polish animations/transitions

**Deliverables:**
- Extension uses design system
- PWA uses design system
- Consistent look across platforms

### Phase 4: Smart Canvas (Weeks 7-8)
**Goal**: AI-powered canvas features

- [ ] Add InsightNode type
- [ ] Implement auto-clustering
- [ ] AI-suggested layouts
- [ ] Group/cluster functionality
- [ ] Search and filter
- [ ] Edge relationship types

**Deliverables:**
- AI insights appear as nodes
- Auto-layout algorithms
- Canvas search works

### Phase 5: Polish & Performance (Week 9)
**Goal**: Production-ready quality

- [ ] Optimize ReactFlow performance (memoization)
- [ ] Add virtual scrolling for large canvases
- [ ] Implement undo/redo
- [ ] Add keyboard shortcuts
- [ ] Accessibility audit (ARIA labels)
- [ ] Responsive testing across devices

**Deliverables:**
- 60fps canvas interactions
- Accessible to screen readers
- Works on all target devices

---

## Part 5: File Structure

```
packages/
  shared/
    src/
      theme/
        tokens.ts               # Design tokens
        ThemeProvider.tsx       # Context provider
        useTheme.ts             # Hook
      components/
        atoms/                   # 15-20 atoms
        molecules/               # 10-15 molecules
        index.ts                 # Barrel export
      hooks/
        useBreakpoint.ts
        useMediaQuery.ts
      utils/
        classNames.ts          # cn() utility
        responsive.ts          # Responsive helpers
  extension/
    src/
      components/
        organisms/              # Extension-specific
        templates/              # Layouts
        canvas/                 # Canvas feature
          CanvasView.tsx
          components/
          hooks/
          utils/
      pages/
        FeedPage.tsx
        CanvasPage.tsx
      styles/
        globals.css            # CSS variables
  pwa/
    src/
      components/
        organisms/              # PWA-specific
      pages/
        HomePage.tsx
        CanvasPage.tsx
```

---

## Part 6: Success Metrics

**Canvas Feature:**
- [ ] Users can create 50+ nodes without performance issues
- [ ] Canvas export works in < 3 seconds
- [ ] 80% of users try the canvas within first week
- [ ] Average session time increases 40%

**Design System:**
- [ ] 100% of UI uses atomic components
- [ ] Zero visual inconsistencies across extension/PWA
- [ ] Component reuse rate > 70%
- [ ] New feature development time reduced 50%

**Responsive:**
- [ ] Lighthouse mobile score > 90
- [ ] Touch targets all > 44px
- [ ] Works on devices 320px - 1920px

---

## Appendix: Technology Stack

**Canvas:**
- `@xyflow/react` - ReactFlow library
- `zustand` - Canvas state management
- `d3-force` - Force-directed layouts

**Design System:**
- CSS-in-JS (inline styles or styled-components)
- CSS Variables for theming
- Storybook for documentation

**Testing:**
- Vitest - Unit testing
- Storybook - Visual testing
- Playwright - E2E testing

**Build:**
- Vite - Module bundling
- TypeScript - Type safety

---

**Ready to implement?** Start with Phase 1 (Foundation) and build incrementally!
