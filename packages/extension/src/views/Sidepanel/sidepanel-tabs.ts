export const sidepanelTabs = ['roost', 'chickens', 'coops', 'nest'] as const;

export type SidepanelTab = (typeof sidepanelTabs)[number];
