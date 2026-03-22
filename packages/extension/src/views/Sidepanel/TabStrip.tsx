type SidepanelTab = 'roost' | 'chickens' | 'coops' | 'nest';

interface SidepanelFooterNavProps {
  activeTab: SidepanelTab;
  onNavigate: (tab: SidepanelTab) => void;
  showNestTab: boolean;
  badges?: Partial<Record<SidepanelTab, number>>;
}

function ChickensIcon() {
  return (
    <svg aria-hidden="true" className="sidepanel-footer-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M6 3.5h5l3.5 3.5V16.5H6z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path
        d="M8.5 10h3M8.5 12.5h2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function RoostIcon() {
  return (
    <svg aria-hidden="true" className="sidepanel-footer-nav__icon" fill="none" viewBox="0 0 20 20">
      <path
        d="M10 3L3 9h2v7h4v-4h2v4h4V9h2L10 3z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function CoopsIcon() {
  return (
    <svg aria-hidden="true" className="sidepanel-footer-nav__icon" fill="none" viewBox="0 0 20 20">
      <rect x="3" y="8" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="8" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 8V5h8v3" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

function NestIcon() {
  return (
    <svg aria-hidden="true" className="sidepanel-footer-nav__icon" fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 3v2M10 15v2M17 10h-2M5 10H3M14.95 5.05l-1.41 1.41M6.46 13.54l-1.41 1.41M14.95 14.95l-1.41-1.41M6.46 6.46L5.05 5.05"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

const navItems: Array<{
  icon: JSX.Element;
  id: SidepanelTab;
  label: string;
}> = [
  { id: 'roost', label: 'Roost', icon: <RoostIcon /> },
  { id: 'chickens', label: 'Chickens', icon: <ChickensIcon /> },
  { id: 'coops', label: 'Coops', icon: <CoopsIcon /> },
  { id: 'nest', label: 'Nest', icon: <NestIcon /> },
];

export function SidepanelFooterNav({
  activeTab,
  onNavigate,
  showNestTab,
  badges,
}: SidepanelFooterNavProps) {
  const visibleItems = showNestTab ? navItems : navItems.filter((item) => item.id !== 'nest');

  return (
    <nav
      aria-label="Sidepanel navigation"
      className="sidepanel-footer-nav"
      style={{
        gridTemplateColumns: `repeat(${visibleItems.length}, 1fr)`,
      }}
    >
      {visibleItems.map((item) => {
        const isActive = item.id === activeTab;
        const badgeCount = badges?.[item.id] ?? 0;
        const showBadge = badgeCount > 0;

        return (
          <button
            aria-current={isActive ? 'page' : undefined}
            className={`sidepanel-footer-nav__button${isActive ? ' is-active' : ''}`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <span className="sidepanel-footer-nav__icon-wrap">
              {item.icon}
              {showBadge ? (
                <span className="sidepanel-footer-nav__badge">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              ) : null}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** @deprecated Use SidepanelFooterNav instead */
export const TabStrip = SidepanelFooterNav;
