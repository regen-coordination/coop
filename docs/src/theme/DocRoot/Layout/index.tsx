import { useLocation } from '@docusaurus/router';
import { getDocsAudience } from '@site/src/lib/docsAudience';
import DocRootLayout from '@theme-original/DocRoot/Layout';
import type { ComponentProps } from 'react';

type Props = ComponentProps<typeof DocRootLayout>;

export default function DocRootLayoutWrapper(props: Props) {
  const location = useLocation();

  return (
    <div className="docsAudienceRoot" data-docs-audience={getDocsAudience(location.pathname)}>
      <DocRootLayout {...props} />
    </div>
  );
}
