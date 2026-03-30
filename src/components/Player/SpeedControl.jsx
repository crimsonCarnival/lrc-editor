import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import NumberInput from '../NumberInput';

const SpeedControl = React.memo(function SpeedControl({
  playbackSpeed,
  applySpeed,
  MIN_SPEED,
  MAX_SPEED,
  SPEED_PRESETS
}) {
  const { t } = useTranslation();
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [speedMenuPos, setSpeedMenuPos] = useState(null);
  const [customSpeedInput, setCustomSpeedInput] = useState('');

  const speedMenuRef = useRef(null);
  const speedBtnRef = useRef(null);

  const handleCustomSpeedSubmit = () => {
    const val = parseFloat(customSpeedInput);
    if (!isNaN(val) && val >= MIN_SPEED && val <= MAX_SPEED) {
      applySpeed(val);
      setCustomSpeedInput('');
      setShowSpeedMenu(false);
    }
  };

  // Close speed menu on outside click
  useEffect(() => {
    if (!showSpeedMenu) return;
    const handler = (e) => {
      const inMenu = speedMenuRef.current && speedMenuRef.current.contains(e.target);
      const inBtn = speedBtnRef.current && speedBtnRef.current.contains(e.target);
      if (!inMenu && !inBtn) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSpeedMenu]);

  return (
    <div className="relative">
      <button
        ref={speedBtnRef}
        id="speed-btn"
        onClick={() => {
          setShowSpeedMenu((prev) => {
            if (!prev && speedBtnRef.current) {
              const rect = speedBtnRef.current.getBoundingClientRect();
              setSpeedMenuPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
              });
            }
            return !prev;
          });
        }}
        title={t('speed') || 'Speed'}
        className={`h-8 sm:h-9 px-2 sm:px-2.5 flex items-center gap-1 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0 text-xs font-mono font-semibold ${
          playbackSpeed !== 1
            ? 'bg-primary text-zinc-950 shadow-lg shadow-primary/30'
            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
        }`}
      >
        {playbackSpeed}x
        <svg
          className={`w-2.5 h-2.5 transition-transform duration-200 ${
            showSpeedMenu ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {showSpeedMenu && speedMenuPos && createPortal(
        <div
          ref={speedMenuRef}
          className="fixed w-44 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in z-[9999]"
          style={{
            top: speedMenuPos.top,
            right: speedMenuPos.right,
          }}
        >
          <div className="p-1.5 max-h-52 overflow-y-auto speed-menu-scroll">
            {SPEED_PRESETS.map((speed) => (
              <button
                key={speed}
                onClick={() => applySpeed(speed)}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono rounded-lg transition-all duration-150 cursor-pointer ${
                  playbackSpeed === speed
                    ? 'bg-primary/20 text-primary font-bold'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                {speed}x {speed === 1 && <span className="text-zinc-500 font-sans">(normal)</span>}
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-700/60 p-2">
            <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1 block">
              {t('customSpeed') || 'Custom'} ({MIN_SPEED}–{MAX_SPEED}x)
            </label>
            <div className="flex gap-1.5">
              <NumberInput
                id="custom-speed-input"
                min={MIN_SPEED}
                max={MAX_SPEED}
                step={0.05}
                value={customSpeedInput}
                onChange={(e) => setCustomSpeedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSpeedSubmit()}
                placeholder="e.g. 1.3"
                className="flex-1 w-0"
              />
              <button
                onClick={handleCustomSpeedSubmit}
                disabled={
                  !customSpeedInput ||
                  isNaN(parseFloat(customSpeedInput)) ||
                  parseFloat(customSpeedInput) < MIN_SPEED ||
                  parseFloat(customSpeedInput) > MAX_SPEED
                }
                className="px-2.5 py-1.5 bg-primary hover:bg-primary-dim disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                ✓
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

export default SpeedControl;
