import type { useCaptureActions } from '../../shared/useCaptureActions';
import type { PopupHomeNoteState } from '../popup-types';

export interface PopupNoteHandlersDeps {
  captureActions: ReturnType<typeof useCaptureActions>;
  noteDraftText: string;
  setNoteDraftText: (value: string | ((current: string) => string)) => void;
  homeNote: {
    setState: (
      value: PopupHomeNoteState | ((current: PopupHomeNoteState) => PopupHomeNoteState),
    ) => void;
  };
  setMessage: (message: string) => void;
}

export function usePopupNoteHandlers(deps: PopupNoteHandlersDeps) {
  const { captureActions, noteDraftText, setNoteDraftText, homeNote, setMessage } = deps;

  async function handleSaveNote() {
    const success = await captureActions.createNoteDraft(noteDraftText);
    if (success) {
      setNoteDraftText('');
      homeNote.setState({ text: '' });
    }
  }

  async function handlePasteNote() {
    try {
      const pasted = await navigator.clipboard.readText();
      if (!pasted.trim()) {
        return;
      }
      setNoteDraftText((current: string) =>
        current.trim() ? `${current.trim()}\n${pasted.trim()}` : pasted.trim(),
      );
    } catch {
      setMessage('Could not paste into the note.');
    }
  }

  return {
    handleSaveNote,
    handlePasteNote,
  };
}
