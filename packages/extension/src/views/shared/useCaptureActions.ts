import type { ReceiverCapture, SoundPreferences } from '@coop/shared';
import { useState } from 'react';
import { playCoopSound } from '../../runtime/audio';
import type { PopupPreparedCapture } from '../../runtime/messages';
import { sendRuntimeMessage } from '../../runtime/messages';
import type { PopupPendingCapture } from '../Popup/popup-types';
import {
  preflightActiveTabCapture,
  preflightManualCapture,
  preflightScreenshotCapture,
} from './capture-preflight';

export function useCaptureActions(deps: {
  setMessage: (message: string) => void;
  loadDashboard: () => Promise<void>;
  afterManualCapture?: () => void;
  afterActiveTabCapture?: () => void;
  soundPreferences?: SoundPreferences;
}) {
  const { setMessage, loadDashboard, afterManualCapture, afterActiveTabCapture, soundPreferences } =
    deps;

  const [isCapturing, setIsCapturing] = useState(false);

  function playCaptureSound() {
    if (soundPreferences) {
      void playCoopSound('capture-complete', soundPreferences).catch(() => {});
    }
  }

  function sizeFromBase64(dataBase64: string) {
    return Math.ceil((dataBase64.length * 3) / 4);
  }

  function toEditableNote(note: string | undefined) {
    const trimmedNote = note?.trim() ?? '';
    return trimmedNote ? `${trimmedNote}\n\n` : '';
  }

  async function encodeBlobBase64(blob: Blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return btoa(binary);
  }

  function toSavePayload(
    pendingCapture: PopupPendingCapture,
    dataBase64: string,
  ): PopupPreparedCapture {
    return {
      kind: pendingCapture.kind,
      dataBase64,
      mimeType: pendingCapture.mimeType,
      fileName: pendingCapture.fileName,
      title: pendingCapture.title.trim() || pendingCapture.title,
      note: pendingCapture.note.trim(),
      sourceUrl: pendingCapture.sourceUrl,
      durationSeconds: pendingCapture.durationSeconds,
    };
  }

  async function runManualCapture() {
    if (isCapturing) return;
    const preflight = await preflightManualCapture();
    if (!preflight.ok) {
      setMessage(preflight.error);
      return;
    }

    setIsCapturing(true);
    try {
      const response = await sendRuntimeMessage<number>({ type: 'manual-capture' });
      const capturedCount = response.data ?? 0;

      if (!response.ok) {
        setMessage(response.error ?? 'Roundup failed — try again.');
        return;
      }

      if (capturedCount > 0) {
        setMessage(`Rounded up ${capturedCount} ${capturedCount === 1 ? 'tab' : 'tabs'}.`);
        playCaptureSound();
        await loadDashboard();
        afterManualCapture?.();
        return;
      }

      setMessage('No eligible tabs were captured.');
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Roundup failed — try again.');
    } finally {
      setIsCapturing(false);
    }
  }

  async function runActiveTabCapture() {
    if (isCapturing) return;
    const preflight = await preflightActiveTabCapture();
    if (!preflight.ok) {
      setMessage(preflight.error);
      return;
    }

    setIsCapturing(true);
    try {
      const response = await sendRuntimeMessage<number>({ type: 'capture-active-tab' });
      const capturedCount = response.data ?? 0;

      if (!response.ok) {
        setMessage(response.error ?? 'Could not capture this tab.');
        return;
      }

      if (capturedCount > 0) {
        setMessage('Tab captured.');
        playCaptureSound();
        await loadDashboard();
        afterActiveTabCapture?.();
        return;
      }

      setMessage('This tab did not produce a new capture.');
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not capture this tab.');
    } finally {
      setIsCapturing(false);
    }
  }

  async function prepareVisibleScreenshot() {
    if (isCapturing) return;
    const preflight = await preflightScreenshotCapture();
    if (!preflight.ok) {
      setMessage(preflight.error);
      return null;
    }

    setIsCapturing(true);
    try {
      const response = await sendRuntimeMessage<PopupPreparedCapture>({
        type: 'prepare-visible-screenshot',
      });
      if (!response.ok || !response.data) {
        setMessage(response.error ?? 'Could not take a screenshot — try again.');
        return null;
      }

      return {
        kind: response.data.kind,
        title: response.data.title,
        note: toEditableNote(response.data.note),
        mimeType: response.data.mimeType,
        fileName: response.data.fileName,
        sourceUrl: response.data.sourceUrl,
        durationSeconds: response.data.durationSeconds,
        byteSize: sizeFromBase64(response.data.dataBase64),
        dataBase64: response.data.dataBase64,
        previewUrl: `data:${response.data.mimeType};base64,${response.data.dataBase64}`,
      } satisfies PopupPendingCapture;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not take a screenshot.');
      return null;
    } finally {
      setIsCapturing(false);
    }
  }

  async function prepareFileCapture(file: File) {
    if (isCapturing) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage('This file is too large — 10 MB maximum.');
      return null;
    }

    return {
      kind: 'file',
      title: file.name || 'File capture',
      note: '',
      mimeType: file.type || 'application/octet-stream',
      fileName: file.name,
      byteSize: file.size,
      blob: file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    } satisfies PopupPendingCapture;
  }

  async function createNoteDraft(text: string): Promise<boolean> {
    if (isCapturing) return false;
    if (!text.trim()) return false;
    setIsCapturing(true);
    try {
      const response = await sendRuntimeMessage({
        type: 'create-note-draft',
        payload: { text },
      });
      setMessage(
        response.ok
          ? 'Note hatched into your roost.'
          : (response.error ?? 'Could not save note — try again.'),
      );
      if (response.ok) playCaptureSound();
      await loadDashboard();
      return response.ok;
    } finally {
      setIsCapturing(false);
    }
  }

  async function prepareAudioCapture(blob: Blob, durationSeconds: number) {
    if (isCapturing) return null;
    return {
      kind: 'audio',
      title: 'Voice note',
      note: '',
      mimeType: blob.type || 'audio/webm',
      fileName: `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`,
      durationSeconds,
      byteSize: blob.size,
      blob,
    } satisfies PopupPendingCapture;
  }

  async function savePendingCapture(pendingCapture: PopupPendingCapture) {
    if (isCapturing) return;
    setIsCapturing(true);
    try {
      const dataBase64 =
        pendingCapture.dataBase64 ??
        (pendingCapture.blob ? await encodeBlobBase64(pendingCapture.blob) : null);

      if (!dataBase64) {
        setMessage('Could not prepare this capture for saving.');
        return false;
      }

      const response = await sendRuntimeMessage<ReceiverCapture>({
        type: 'save-popup-capture',
        payload: toSavePayload(pendingCapture, dataBase64),
      });

      if (!response.ok) {
        setMessage(response.error ?? 'Could not save this capture.');
        return false;
      }

      const successMessage =
        pendingCapture.kind === 'photo'
          ? 'Screenshot saved to Pocket Coop finds.'
          : pendingCapture.kind === 'file'
            ? 'File saved to Pocket Coop finds.'
            : 'Voice note saved.';

      setMessage(successMessage);
      playCaptureSound();
      await loadDashboard();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this capture.');
      return false;
    } finally {
      setIsCapturing(false);
    }
  }

  async function saveAudioCaptureDirect(blob: Blob, durationSeconds: number, title = 'Voice note') {
    const pendingCapture = await prepareAudioCapture(blob, durationSeconds);
    if (!pendingCapture) {
      return false;
    }

    pendingCapture.title = title;
    return savePendingCapture(pendingCapture);
  }

  return {
    runManualCapture,
    runActiveTabCapture,
    prepareVisibleScreenshot,
    prepareFileCapture,
    prepareAudioCapture,
    savePendingCapture,
    saveAudioCaptureDirect,
    createNoteDraft,
    isCapturing,
  };
}
