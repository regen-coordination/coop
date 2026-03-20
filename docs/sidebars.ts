import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const communityClassName = 'docs-audience-item docs-audience-item--community';
const builderClassName = 'docs-audience-item docs-audience-item--builder';

function communityDoc(id: string) {
  return {
    type: 'doc' as const,
    id,
    className: communityClassName,
  };
}

function builderDoc(id: string) {
  return {
    type: 'doc' as const,
    id,
    className: builderClassName,
  };
}

const sidebars: SidebarsConfig = {
  docs: [
    communityDoc('community/welcome-to-coop'),
    communityDoc('community/how-it-works'),
    communityDoc('community/why-we-build'),
    communityDoc('community/road-ahead'),
    communityDoc('community/creating-a-coop'),
    communityDoc('community/joining-a-coop'),
    communityDoc('community/sharing-knowledge'),
    communityDoc('community/ai-features'),
    communityDoc('community/privacy-security'),
    communityDoc('community/pricing'),
    {
      type: 'link',
      label: 'Glossary',
      href: '/glossary',
      className: communityClassName,
    },
    builderDoc('builder/getting-started'),
    builderDoc('builder/how-to-contribute'),
    builderDoc('builder/architecture'),
    builderDoc('builder/extension'),
    builderDoc('builder/app'),
    builderDoc('builder/agentic-harness'),
    builderDoc('builder/p2p-functionality'),
    {
      type: 'category',
      label: 'Integrations',
      className: builderClassName,
      link: {
        type: 'doc',
        id: 'builder/integrations/index',
      },
      collapsed: true,
      items: [
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
    builderDoc('builder/rd'),
    {
      type: 'link',
      label: 'Glossary',
      href: '/glossary#builder-terms',
      className: builderClassName,
    },
  ],
};

export default sidebars;
