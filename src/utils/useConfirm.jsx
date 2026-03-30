import { useState, useCallback } from 'react';
import { useSettings } from '../contexts/useSettings';
import ConfirmModal from '../components/ConfirmModal';

/**
 * Hook that provides a consistent confirm-before-destructive-action pattern.
 * Returns [requestConfirm, ConfirmModalElement].
 *
 * Usage:
 *   const [requestConfirm, confirmModal] = useConfirm();
 *   requestConfirm('Are you sure?', () => { doThing(); });
 *   // Render {confirmModal} somewhere in the JSX tree
 */
export default function useConfirm() {
  const { settings } = useSettings();
  const [config, setConfig] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
  });

  const requestConfirm = useCallback((message, action) => {
    if (settings.advanced?.confirmDestructive) {
      setConfig({ isOpen: true, message, onConfirm: action });
    } else {
      action();
    }
  }, [settings.advanced?.confirmDestructive]);

  const modal = (
    <ConfirmModal
      isOpen={config.isOpen}
      message={config.message}
      onConfirm={() => {
        const action = config.onConfirm;
        setConfig({ isOpen: false, message: '', onConfirm: null });
        if (action) setTimeout(action, 0);
      }}
      onCancel={() => setConfig({ isOpen: false, message: '', onConfirm: null })}
    />
  );

  return [requestConfirm, modal];
}
