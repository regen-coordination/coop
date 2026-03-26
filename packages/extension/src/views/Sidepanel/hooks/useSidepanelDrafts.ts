import { sendRuntimeMessage } from '../../../runtime/messages';
import { downloadText } from '../helpers';
import type { useDashboard } from './useDashboard';

type SaveFilePickerHandle = {
  createWritable: () => Promise<{
    write: (data: Blob | string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

export interface SidepanelDraftsDeps {
  activeCoop: ReturnType<typeof useDashboard>['activeCoop'];
  dashboard: ReturnType<typeof useDashboard>['dashboard'];
  browserUxCapabilities: ReturnType<typeof useDashboard>['browserUxCapabilities'];
  setMessage: (msg: string) => void;
  loadDashboard: ReturnType<typeof useDashboard>['loadDashboard'];
}

export function useSidepanelDrafts(deps: SidepanelDraftsDeps) {
  const { activeCoop, dashboard, browserUxCapabilities, setMessage, loadDashboard } = deps;

  async function saveTextExport(
    filename: string,
    value: string,
  ): Promise<'download' | 'file-picker'> {
    const exportMethod = dashboard?.uiPreferences.preferredExportMethod ?? 'download';
    if (exportMethod !== 'file-picker' || !browserUxCapabilities.canSaveFile) {
      await downloadText(filename, value);
      return 'download';
    }

    const extension = filename.split('.').pop()?.toLowerCase() === 'json' ? 'json' : 'txt';
    const mimeType = extension === 'json' ? 'application/json' : 'text/plain;charset=utf-8';

    const savePickerWindow = globalThis as typeof globalThis & {
      showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<SaveFilePickerHandle>;
    };

    try {
      const handle = await savePickerWindow.showSaveFilePicker?.({
        suggestedName: filename,
        types: [
          {
            description: extension === 'json' ? 'JSON export' : 'Text export',
            accept: {
              [mimeType]: [`.${extension}`],
            },
          },
        ],
      });

      if (!handle) {
        await downloadText(filename, value);
        return 'download';
      }

      const writable = await handle.createWritable();
      await writable.write(new Blob([value], { type: mimeType }));
      await writable.close();
      return 'file-picker';
    } catch {
      await downloadText(filename, value);
      return 'download';
    }
  }

  async function archiveArtifact(artifactId: string) {
    if (!activeCoop) {
      return;
    }
    const response = await sendRuntimeMessage({
      type: 'archive-artifact',
      payload: {
        coopId: activeCoop.profile.id,
        artifactId,
      },
    });
    setMessage(
      response.ok ? 'Saved proof created and stored.' : (response.error ?? 'Save failed.'),
    );
    await loadDashboard();
  }

  async function toggleArtifactArchiveWorthiness(artifactId: string, flagged: boolean) {
    if (!activeCoop) {
      return;
    }
    const response = await sendRuntimeMessage({
      type: 'set-artifact-archive-worthy',
      payload: {
        coopId: activeCoop.profile.id,
        artifactId,
        archiveWorthy: flagged,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not update the save mark.');
      return;
    }
    setMessage(flagged ? 'Shared find marked worth saving.' : 'Shared find save mark removed.');
    await loadDashboard();
  }

  async function archiveLatestArtifact() {
    if (!activeCoop || activeCoop.artifacts.length === 0) {
      return;
    }
    const latest = [...activeCoop.artifacts].reverse()[0];
    if (!latest) {
      return;
    }
    await archiveArtifact(latest.id);
  }

  async function archiveSnapshot() {
    if (!activeCoop) {
      return;
    }
    const response = await sendRuntimeMessage({
      type: 'archive-snapshot',
      payload: {
        coopId: activeCoop.profile.id,
      },
    });
    setMessage(
      response.ok ? 'Coop snapshot saved with proof.' : (response.error ?? 'Snapshot save failed.'),
    );
    await loadDashboard();
  }

  async function refreshArchiveStatus(receiptId?: string) {
    if (!activeCoop) {
      return;
    }

    const response = await sendRuntimeMessage<{
      checked: number;
      updated: number;
      failed: number;
      message: string;
    }>({
      type: 'refresh-archive-status',
      payload: {
        coopId: activeCoop.profile.id,
        receiptId,
      },
    });
    setMessage(
      response.ok
        ? (response.data?.message ?? 'Saved proof check completed.')
        : (response.error ?? 'Saved proof check failed.'),
    );
    await loadDashboard();
  }

  async function exportSnapshot(format: 'json' | 'text') {
    if (!activeCoop) {
      return;
    }
    const response = await sendRuntimeMessage<string>({
      type: 'export-snapshot',
      payload: {
        coopId: activeCoop.profile.id,
        format,
      },
    });
    if (!response.ok || !response.data) {
      setMessage(response.error ?? 'Snapshot export failed.');
      return;
    }
    const method = await saveTextExport(
      `${activeCoop.profile.name}-snapshot.${format === 'json' ? 'json' : 'txt'}`,
      response.data,
    );
    setMessage(
      `Coop snapshot exported as ${format.toUpperCase()} via ${
        method === 'file-picker' ? 'file picker' : 'download'
      }.`,
    );
  }

  async function exportLatestArtifact(format: 'json' | 'text') {
    if (!activeCoop || activeCoop.artifacts.length === 0) {
      return;
    }
    const latest = [...activeCoop.artifacts].reverse()[0];
    if (!latest) {
      return;
    }
    const response = await sendRuntimeMessage<string>({
      type: 'export-artifact',
      payload: {
        coopId: activeCoop.profile.id,
        artifactId: latest.id,
        format,
      },
    });
    if (!response.ok || !response.data) {
      setMessage(response.error ?? 'Shared find export failed.');
      return;
    }
    const method = await saveTextExport(
      `${activeCoop.profile.name}-artifact.${format === 'json' ? 'json' : 'txt'}`,
      response.data,
    );
    setMessage(
      `Latest shared find exported as ${format.toUpperCase()} via ${
        method === 'file-picker' ? 'file picker' : 'download'
      }.`,
    );
  }

  async function exportLatestReceipt(format: 'json' | 'text') {
    if (!activeCoop || activeCoop.archiveReceipts.length === 0) {
      return;
    }
    const latest = [...activeCoop.archiveReceipts].reverse()[0];
    if (!latest) {
      return;
    }
    const response = await sendRuntimeMessage<string>({
      type: 'export-receipt',
      payload: {
        coopId: activeCoop.profile.id,
        receiptId: latest.id,
        format,
      },
    });
    if (!response.ok || !response.data) {
      setMessage(response.error ?? 'Saved proof export failed.');
      return;
    }
    const method = await saveTextExport(
      `${activeCoop.profile.name}-archive-receipt.${format === 'json' ? 'json' : 'txt'}`,
      response.data,
    );
    setMessage(
      `Latest saved proof exported as ${format.toUpperCase()} via ${
        method === 'file-picker' ? 'file picker' : 'download'
      }.`,
    );
  }

  function handleAnchorOnChain(receiptId: string) {
    void sendRuntimeMessage({
      type: 'anchor-archive-cid',
      payload: {
        coopId: activeCoop?.profile.id ?? '',
        receiptId,
      },
    }).then(async (result) => {
      setMessage(result.ok ? 'Anchor transaction submitted.' : (result.error ?? 'Anchor failed.'));
      await loadDashboard();
    });
  }

  function handleFvmRegister(receiptId: string) {
    if (!activeCoop) return;
    void sendRuntimeMessage({
      type: 'fvm-register-archive',
      payload: {
        coopId: activeCoop.profile.id,
        receiptId,
      },
    }).then(async (result) => {
      setMessage(
        result.ok
          ? 'Saved proof registered on Filecoin.'
          : (result.error ?? 'Filecoin registration had trouble.'),
      );
      await loadDashboard();
    });
  }

  return {
    saveTextExport,
    archiveArtifact,
    toggleArtifactArchiveWorthiness,
    archiveLatestArtifact,
    archiveSnapshot,
    refreshArchiveStatus,
    exportSnapshot,
    exportLatestArtifact,
    exportLatestReceipt,
    handleAnchorOnChain,
    handleFvmRegister,
  };
}
