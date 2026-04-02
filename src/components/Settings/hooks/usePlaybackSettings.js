export function usePlaybackSettings(settings, updateSetting) {
  const handleAutoRewindChange = (e) => {
    const val = Math.max(0, parseFloat(e.target.value) || 0);
    updateSetting('playback.autoRewindOnPause', { enabled: val > 0, seconds: val });
  };

  const handleMinSpeedChange = (e) => {
    updateSetting(
      'playback.speedBounds.min',
      Math.max(0.05, parseFloat(e.target.value) || 0.05),
    );
  };

  const handleMaxSpeedChange = (e) => {
    updateSetting(
      'playback.speedBounds.max',
      Math.max(
        (settings.playback?.speedBounds?.min || 0.25) + 0.05,
        parseFloat(e.target.value) || 1,
      ),
    );
  };

  const handleShowWaveformChange = (v) => updateSetting('playback.showWaveform', v);
  const handleWaveformSnapChange = (v) => updateSetting('playback.waveformSnap', v);

  return {
    handleAutoRewindChange,
    handleMinSpeedChange,
    handleMaxSpeedChange,
    handleShowWaveformChange,
    handleWaveformSnapChange,
  };
}
