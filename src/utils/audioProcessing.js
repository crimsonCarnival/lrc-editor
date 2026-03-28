/**
 * Vocal isolation utility using Web Audio API.
 * Applies a bandpass filter (300Hz–3000Hz) to emphasize vocal frequencies.
 */

export function createVocalIsolation(audioElement) {
  let ctx = null;
  let source = null;
  let highpass = null;
  let lowpass = null;
  let enabled = false;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    source = ctx.createMediaElementSource(audioElement);
    
    highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 300;
    highpass.Q.value = 0.7;

    lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3000;
    lowpass.Q.value = 0.7;

    // Default: bypass filters (source → destination)
    source.connect(ctx.destination);
  }

  function enable() {
    if (!ctx) init();
    if (enabled) return;
    source.disconnect();
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(ctx.destination);
    enabled = true;
  }

  function disable() {
    if (!ctx || !enabled) return;
    source.disconnect();
    highpass.disconnect();
    lowpass.disconnect();
    source.connect(ctx.destination);
    enabled = false;
  }

  function toggle() {
    if (!ctx) init();
    if (enabled) disable();
    else enable();
    return enabled;
  }

  function destroy() {
    if (ctx) {
      source?.disconnect();
      highpass?.disconnect();
      lowpass?.disconnect();
      ctx.close();
      ctx = null;
      source = null;
      highpass = null;
      lowpass = null;
      enabled = false;
    }
  }

  function isEnabled() {
    return enabled;
  }

  function getContext() {
    return ctx;
  }

  return { init, enable, disable, toggle, destroy, isEnabled, getContext };
}
