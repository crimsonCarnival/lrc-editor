import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Kbd } from '@/components/ui/kbd';
import { KEY_SYMBOLS } from './keySymbols';

export function Toggle({ checked, onChange, id }) {
  return (
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-primary"
    />
  );
}

export function SettingRow({ label, description, icon: Icon, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
          {label}
        </p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function Section({ title, icon: Icon, children, searchTerm }) {
  const filteredChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    if (searchTerm) {
      const label =
        typeof child.props.label === 'string'
          ? child.props.label
          : child.props.label?.props?.children || '';
      const desc =
        typeof child.props.description === 'string' ? child.props.description : '';

      const match =
        label.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        desc.toString().toLowerCase().includes(searchTerm.toLowerCase());

      if (!match) return null;
    }

    return child;
  });

  if (searchTerm && !filteredChildren?.some(Boolean)) return null;

  return (
    <div className={`mb-5 ${searchTerm ? 'animate-fade-in' : ''}`}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {title}
      </h4>
      <div className="bg-zinc-800/40 rounded-xl px-4 divide-y divide-zinc-700/40">
        {filteredChildren}
      </div>
    </div>
  );
}

export function ModifierInput({ value, onChange, validateModifier }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(false);

  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }
    let mod = null;
    if (e.key === 'Shift') mod = 'Shift';
    else if (e.key === 'Control') mod = 'Ctrl';
    else if (e.key === 'Alt') mod = 'Alt';
    else if (e.key === 'Meta') mod = 'Ctrl';
    else return;

    if (validateModifier && !validateModifier(mod)) {
      setError(true);
      setTimeout(() => setError(false), 800);
      setRecording(false);
      return;
    }
    onChange(mod);
    setRecording(false);
  };

  const displayVal = value ? (KEY_SYMBOLS[value] ?? value) : null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        className={`px-2.5 py-1.5 rounded-lg min-w-[70px] flex items-center justify-center gap-0.5 transition-all outline-none ${
          error
            ? 'bg-red-500/20 border border-red-500 ring-2 ring-red-500/50'
            : recording
            ? 'bg-primary/10 border border-primary ring-2 ring-primary/40'
            : 'bg-zinc-800/60 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
        }`}
        onClick={() => setRecording(true)}
        onKeyDown={recording ? handleKeyDown : undefined}
        onBlur={() => setRecording(false)}
      >
        {error ? (
          <span className="text-red-400 text-xs font-medium">Taken!</span>
        ) : recording ? (
          <span className="text-primary text-xs animate-pulse font-medium">Modifier…</span>
        ) : displayVal ? (
          <Kbd className="bg-zinc-700/60 text-zinc-200 border border-zinc-600/50 h-auto px-1.5 py-0.5 text-xs">
            {displayVal}
          </Kbd>
        ) : (
          <span className="text-zinc-500 text-xs">None</span>
        )}
      </button>
      <span className="text-zinc-500 text-[10px]">+ Click</span>
    </div>
  );
}

export function ShortcutInput({ value, onChange, onValidate, conflict }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(false);

  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    let keyName = e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    parts.push(keyName);
    const newKey = parts.join('+');

    if (onValidate && !onValidate(newKey)) {
      setError(true);
      setTimeout(() => setError(false), 800);
      setRecording(false);
      return;
    }
    onChange(newKey);
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        className={`px-2.5 py-1.5 rounded-lg min-w-[80px] flex items-center justify-center gap-0.5 transition-all outline-none ${
          error
            ? 'bg-red-500/20 border border-red-500 ring-2 ring-red-500/50'
            : conflict
            ? 'border border-amber-500/70 bg-amber-500/10'
            : recording
            ? 'bg-primary/10 border border-primary ring-2 ring-primary/40'
            : 'bg-zinc-800/60 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
        }`}
        onClick={() => setRecording(true)}
        onKeyDown={recording ? handleKeyDown : undefined}
        onBlur={() => setRecording(false)}
      >
        {error ? (
          <span className="text-red-400 text-xs font-medium">Taken!</span>
        ) : recording ? (
          <span className="text-primary text-xs animate-pulse font-medium">Press key…</span>
        ) : value ? (
          value.split(/(?<=.)\+/).map((part, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-zinc-600 text-[10px] mx-0.5">+</span>}
              <Kbd className="bg-zinc-700/60 text-zinc-200 border border-zinc-600/50 h-auto px-1.5 py-0.5 text-xs">
                {KEY_SYMBOLS[part] ?? part}
              </Kbd>
            </React.Fragment>
          ))
        ) : (
          <span className="text-zinc-500 text-xs">None</span>
        )}
      </button>
      {conflict && (
        <span className="text-[10px] text-amber-400 font-medium leading-none">
          ⚠ {conflict}
        </span>
      )}
    </div>
  );
}
