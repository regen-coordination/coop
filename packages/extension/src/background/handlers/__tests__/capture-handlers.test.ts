import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Chrome API mock ---

const chromeTabsMock = {
  query: vi.fn(),
  captureVisibleTab: vi.fn(),
};
const chromeScrMock = {
  executeScript: vi.fn(),
};

beforeEach(() => {
  Object.assign(globalThis, {
    chrome: {
      tabs: chromeTabsMock,
      scripting: chromeScrMock,
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(globalThis, 'chrome');
});

// --- Mocks for context ---

function mockDexieTable() {
  const chain = {
    put: vi.fn(),
    where: vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
        sortBy: vi.fn().mockResolvedValue([]),
      }),
    }),
  };
  return chain;
}

vi.mock('../../context', () => ({
  db: {
    tabCandidates: mockDexieTable(),
    pageExtracts: mockDexieTable(),
    reviewDrafts: { bulkPut: vi.fn(), put: vi.fn() },
    receiverCaptures: { ...mockDexieTable(), get: vi.fn().mockResolvedValue(undefined) },
    encryptedLocalPayloads: { ...mockDexieTable(), get: vi.fn().mockResolvedValue(undefined) },
    captureRuns: { put: vi.fn() },
    settings: { get: vi.fn().mockResolvedValue(undefined) },
    transaction: vi.fn((_mode: string, _tables: unknown[], fn: () => Promise<void>) => fn()),
  },
  extensionCaptureDeviceId: 'extension-browser',
  getCoops: vi.fn().mockResolvedValue([]),
  prefersLocalEnhancement: false,
  setRuntimeHealth: vi.fn(),
  notifyExtensionEvent: vi.fn(),
  getLocalSetting: vi.fn().mockResolvedValue('manual'),
  stateKeys: { captureMode: 'capture-mode' },
  getCapturePeriodMinutes: vi.fn().mockReturnValue(null),
  markUrlCaptured: vi.fn(),
  wasRecentlyCaptured: vi.fn().mockReturnValue(false),
  uiPreferences: {
    excludedCategories: [],
    customExcludedDomains: [],
    captureOnClose: false,
  },
  ensureDbReady: vi.fn().mockResolvedValue(undefined),
  tabUrlCache: new Map(),
  removeFromTabCache: vi.fn(),
}));

vi.mock('../../dashboard', () => ({
  refreshBadge: vi.fn(),
}));

vi.mock('../../operator', () => ({
  getActiveReviewContextForSession: vi.fn().mockResolvedValue({
    activeCoopId: undefined,
    activeMemberId: undefined,
  }),
}));

vi.mock('../agent', () => ({
  syncHighConfidenceDraftObservations: vi.fn(),
  emitRoundupBatchObservation: vi.fn(),
  emitAudioTranscriptObservation: vi.fn(),
  drainAgentCycles: vi.fn(),
}));

vi.mock('@coop/shared', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getAuthSession: vi.fn().mockResolvedValue(null),
    saveReceiverCapture: vi.fn().mockResolvedValue(undefined),
    saveReviewDraft: vi.fn().mockResolvedValue(undefined),
    updateReceiverCapture: vi.fn().mockResolvedValue(undefined),
    isWhisperSupported: vi.fn().mockResolvedValue(false),
    transcribeAudio: vi.fn().mockResolvedValue({ text: '', segments: [], duration: 0 }),
    saveCoopBlob: vi.fn().mockResolvedValue(undefined),
  };
});

const { captureActiveTab, captureAudio, captureFile, createNoteDraft, runCaptureCycle } =
  await import('../capture');

describe('capture handlers', () => {
  it('returns 0 when no active tab is found', async () => {
    chromeTabsMock.query.mockResolvedValue([]);
    const count = await captureActiveTab();
    expect(count).toBe(0);
  });

  it('skips tabs with unsupported urls', async () => {
    chromeTabsMock.query.mockResolvedValue([
      { id: 1, url: 'chrome://extensions', windowId: 1 },
      { id: 2, url: 'about:blank', windowId: 1 },
    ]);
    const count = await runCaptureCycle();
    expect(count).toBe(0);
  });

  it('captures a valid http tab and returns count 1', async () => {
    chromeTabsMock.query.mockResolvedValueOnce([
      { id: 10, url: 'https://example.com/page', windowId: 1, title: 'Example' },
    ]);
    chromeScrMock.executeScript.mockResolvedValue([
      {
        result: {
          title: 'Example Page',
          metaDescription: 'An example page',
          headings: ['Welcome'],
          paragraphs: ['Hello world'],
          previewImageUrl: undefined,
        },
      },
    ]);

    const count = await captureActiveTab();
    expect(count).toBe(1);
  });

  it('records a failed capture run when scripting throws', async () => {
    chromeTabsMock.query.mockResolvedValue([
      { id: 20, url: 'https://restricted.com', windowId: 1, title: 'Restricted' },
    ]);
    chromeScrMock.executeScript.mockRejectedValue(new Error('Cannot access'));

    const { setRuntimeHealth } = await import('../../context');
    const count = await runCaptureCycle();
    expect(count).toBe(0);
    expect(vi.mocked(setRuntimeHealth)).toHaveBeenCalledWith(
      expect.objectContaining({ syncError: true }),
    );
  });
});

describe('captureFile', () => {
  it('throws when file exceeds 10 MB limit', async () => {
    await expect(
      captureFile({
        fileName: 'huge.bin',
        mimeType: 'application/octet-stream',
        dataBase64: btoa('x'),
        byteSize: 11 * 1024 * 1024,
      }),
    ).rejects.toThrow('File exceeds the 10 MB size limit.');
  });

  it('returns a capture with kind file for valid payload', async () => {
    const capture = await captureFile({
      fileName: 'test.pdf',
      mimeType: 'application/pdf',
      dataBase64: btoa('hello'),
      byteSize: 5,
    });
    expect(capture).toHaveProperty('id');
    expect(capture.kind).toBe('file');
    expect(capture.fileName).toBe('test.pdf');

    const { refreshBadge } = await import('../../dashboard');
    expect(vi.mocked(refreshBadge)).toHaveBeenCalled();
  });
});

describe('createNoteDraft', () => {
  it('throws when text is empty', async () => {
    await expect(createNoteDraft({ text: '   ' })).rejects.toThrow('Note text cannot be empty.');
  });

  it('creates a draft for valid note text', async () => {
    const draft = await createNoteDraft({ text: 'My observation about the project' });
    expect(draft).toHaveProperty('id');
    expect(draft.workflowStage).toBe('candidate');

    const { refreshBadge } = await import('../../dashboard');
    expect(vi.mocked(refreshBadge)).toHaveBeenCalled();
  });
});

describe('captureAudio', () => {
  it('throws when audio exceeds 25 MB limit', async () => {
    // Create a base64 string whose estimated decoded size > 25 MB
    // Base64 decodes to ~75% of its length, so 34 MB of base64 chars ≈ 25.5 MB decoded
    const oversizedBase64 = 'A'.repeat(34 * 1024 * 1024);
    await expect(
      captureAudio({
        dataBase64: oversizedBase64,
        mimeType: 'audio/webm',
        durationSeconds: 10,
        fileName: 'big-audio.webm',
      }),
    ).rejects.toThrow('Audio recording exceeds the 25 MB size limit.');
  });

  it('returns a capture with kind audio for valid payload', async () => {
    const capture = await captureAudio({
      dataBase64: btoa('audio-data'),
      mimeType: 'audio/webm',
      durationSeconds: 5,
      fileName: 'note.webm',
    });
    expect(capture).toHaveProperty('id');
    expect(capture.kind).toBe('audio');
    expect(capture.fileName).toBe('note.webm');

    const { refreshBadge } = await import('../../dashboard');
    expect(vi.mocked(refreshBadge)).toHaveBeenCalled();
  });

  it('emits an observation and notification when Whisper transcription succeeds', async () => {
    const shared = await import('@coop/shared');
    vi.mocked(shared.isWhisperSupported).mockResolvedValue(true);
    vi.mocked(shared.transcribeAudio).mockResolvedValue({
      text: 'Maria mentioned the EPA grant requires 20% local match',
      segments: [
        {
          start: 0,
          end: 5,
          text: 'Maria mentioned the EPA grant requires 20% local match',
          confidence: 1,
        },
      ],
      duration: 5,
      language: 'en',
      modelId: 'whisper-tiny.en',
    });

    await captureAudio({
      dataBase64: btoa('audio-data'),
      mimeType: 'audio/webm',
      durationSeconds: 5,
      fileName: 'voice-note.webm',
    });

    // Allow fire-and-forget async IIFE to settle
    await vi.waitFor(() => Promise.resolve(), { timeout: 200 });

    const { emitAudioTranscriptObservation } = await import('../agent');
    expect(vi.mocked(emitAudioTranscriptObservation)).toHaveBeenCalledWith(
      expect.objectContaining({
        captureId: expect.any(String),
        transcriptText: 'Maria mentioned the EPA grant requires 20% local match',
        durationSeconds: 5,
      }),
    );

    const { notifyExtensionEvent } = await import('../../context');
    expect(vi.mocked(notifyExtensionEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKind: 'transcript-ready',
        title: 'Voice note transcribed',
      }),
    );
  });

  it('does not emit observation when Whisper is unsupported', async () => {
    const shared = await import('@coop/shared');
    vi.mocked(shared.isWhisperSupported).mockResolvedValue(false);

    await captureAudio({
      dataBase64: btoa('audio-data'),
      mimeType: 'audio/webm',
      durationSeconds: 5,
      fileName: 'voice-note.webm',
    });

    await new Promise((r) => setTimeout(r, 50));

    const { emitAudioTranscriptObservation } = await import('../agent');
    expect(vi.mocked(emitAudioTranscriptObservation)).not.toHaveBeenCalled();
  });
});
