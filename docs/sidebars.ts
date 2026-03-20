import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Community',
      collapsible: false,
      className: 'docs-audience-group docs-audience-group--community',
      items: [
        'community/welcome-to-coop',
        'community/how-it-works',
        'community/why-we-build',
        'community/road-ahead',
        'community/creating-a-coop',
        'community/joining-a-coop',
        'community/sharing-knowledge',
        'community/ai-features',
        'community/privacy-security',
        'community/pricing',
        {
          type: 'link',
          label: 'Glossary',
          href: '/glossary',
        },
      ],
    },
    {
      type: 'category',
      label: 'Builder',
      collapsible: false,
      className: 'docs-audience-group docs-audience-group--builder',
      items: [
        'builder/getting-started',
        'builder/how-to-contribute',
        'builder/architecture',
        'builder/extension',
        'builder/app',
        'builder/agentic-harness',
        'builder/p2p-functionality',
        {
          type: 'category',
          label: 'Integrations',
          items: [
            'builder/integrations/index',
            'builder/integrations/webauthn',
            'builder/integrations/webllm',
            'builder/integrations/yjs',
            'builder/integrations/dexie',
            'builder/integrations/gnosis-safe',
            'builder/integrations/green-goods',
            'builder/integrations/filecoin',
            'builder/integrations/storacha',
          ],
        },
        'builder/rd',
        {
          type: 'link',
          label: 'Glossary',
          href: '/glossary#builder-terms',
        },
      ],
    },
  ],
};

export default sidebars;
