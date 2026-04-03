import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NumberInput from '../shared/NumberInput';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Minus, Plus } from 'lucide-react';

const SpeedControl = React.memo(function SpeedControl({
  playbackSpeed,
  applySpeed,
  MIN_SPEED,
  MAX_SPEED,
  SPEED_PRESETS
}) {
  const { t } = useTranslation();
  const [customSpeedInput, setCustomSpeedInput] = useState('');

  const handleCustomSpeedSubmit = () => {
    const val = parseFloat(customSpeedInput);
    if (!isNaN(val) && val >= MIN_SPEED && val <= MAX_SPEED) {
      applySpeed(val);
      setCustomSpeedInput('');
    }
  };

  const isCustomValid =
    customSpeedInput &&
    !isNaN(parseFloat(customSpeedInput)) &&
    parseFloat(customSpeedInput) >= MIN_SPEED &&
    parseFloat(customSpeedInput) <= MAX_SPEED;

  const stepDown = () => applySpeed(Math.round((playbackSpeed - 0.05) * 1000) / 1000);
  const stepUp = () => applySpeed(Math.round((playbackSpeed + 0.05) * 1000) / 1000);

  return (
    <div className="flex items-center gap-0.5 flex-shrink-0" role="group" aria-label={t('player.speed') || 'Playback speed'}>
      {/* Speed down */}
      <button
        onClick={stepDown}
        disabled={playbackSpeed <= MIN_SPEED}
        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hidden sm:block"
        aria-label="Decrease speed"
      >
        <Minus className="w-3 h-3" />
      </button>

      {/* Speed badge + dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id="speed-btn"
            title={t('player.speed') || 'Speed'}
            aria-label={`${t('player.speed') || 'Speed'}: ${playbackSpeed}x`}
            className={`h-8 sm:h-9 px-2 sm:px-2.5 font-mono font-semibold rounded-full gap-1 ${
              playbackSpeed !== 1
                ? 'bg-primary text-zinc-950 shadow-lg shadow-primary/30 hover:bg-primary-dim'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            {playbackSpeed}x
            <ChevronDown className="w-2.5 h-2.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-44 bg-zinc-900 border-zinc-700/80 p-0 overflow-hidden"
          align="end"
        >
          <div className="p-1.5 max-h-52 overflow-y-auto">
            {SPEED_PRESETS.map((speed) => (
              <DropdownMenuItem
                key={speed}
                onClick={() => applySpeed(speed)}
                className={`text-xs font-mono rounded-lg cursor-pointer ${
                  playbackSpeed === speed
                    ? 'bg-primary/20 text-primary font-bold focus:bg-primary/30 focus:text-primary'
                    : 'text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100'
                }`}
              >
                {speed}x {speed === 1 && <span className="text-zinc-500 font-sans ml-1">(normal)</span>}
              </DropdownMenuItem>
            ))}
          </div>
          <div className="border-t border-zinc-700/60 p-2" onPointerDown={(e) => e.stopPropagation()}>
            <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1 block">
              {t('player.customSpeed') || 'Custom'} ({MIN_SPEED}–{MAX_SPEED}x)
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
              <Button
                size="xs"
                onClick={handleCustomSpeedSubmit}
                disabled={!isCustomValid}
                className="px-2.5 bg-primary hover:bg-primary-dim disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold"
              >
                ✓
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Speed up */}
      <button
        onClick={stepUp}
        disabled={playbackSpeed >= MAX_SPEED}
        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hidden sm:block"
        aria-label="Increase speed"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
});

export default SpeedControl;
