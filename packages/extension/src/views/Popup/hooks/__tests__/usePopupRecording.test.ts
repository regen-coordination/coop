import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePopupRecording } from '../usePopupRecording';

describe('usePopupRecording', () => {
  const onRecordingReady = vi.fn().mockResolvedValue(undefined);
  const onEmergencySave = vi.fn().mockResolvedValue(undefined);
  const setMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts with isRecording false and elapsedSeconds 0', () => {
    const { result } = renderHook(() =>
      usePopupRecording({ onEmergencySave, onRecordingReady, setMessage }),
    );
    expect(result.current.isRecording).toBe(false);
    expect(result.current.status).toBe('idle');
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('moves into a recoverable denied state when getUserMedia is not available', async () => {
    const originalNav = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() =>
      usePopupRecording({ onEmergencySave, onRecordingReady, setMessage }),
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.status).toBe('denied');
    expect(result.current.permissionMessage).toBe('This browser cannot record audio.');
    expect(setMessage).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalNav,
      writable: true,
      configurable: true,
    });
  });

  it('cancelRecording sets commit mode to cancel', () => {
    const { result } = renderHook(() =>
      usePopupRecording({ onEmergencySave, onRecordingReady, setMessage }),
    );

    // cancelRecording on inactive recorder should be a no-op
    act(() => {
      result.current.cancelRecording();
    });

    expect(result.current.isRecording).toBe(false);
  });

  it('reads partial save message from sessionStorage on mount', () => {
    sessionStorage.setItem('coop:popup-partial-recording', 'Partial voice note saved (5s).');

    const { result } = renderHook(() =>
      usePopupRecording({ onEmergencySave, onRecordingReady, setMessage }),
    );

    expect(result.current.partialSaveMessage).toBe('Partial voice note saved (5s).');
    // sessionStorage should be cleaned up
    expect(sessionStorage.getItem('coop:popup-partial-recording')).toBeNull();
  });

  it('clearPartialSaveMessage clears the message', () => {
    sessionStorage.setItem('coop:popup-partial-recording', 'Saved!');

    const { result } = renderHook(() =>
      usePopupRecording({ onEmergencySave, onRecordingReady, setMessage }),
    );

    expect(result.current.partialSaveMessage).toBe('Saved!');

    act(() => {
      result.current.clearPartialSaveMessage();
    });

    expect(result.current.partialSaveMessage).toBeNull();
  });
});
