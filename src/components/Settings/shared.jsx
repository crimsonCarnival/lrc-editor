import React, { useState } from 'react';

export function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${
        checked ? 'bg-primary' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

export function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function Section({ title, children, searchTerm }) {
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
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">
        {title}
      </h4>
      <div className="bg-zinc-800/40 rounded-xl px-4 divide-y divide-zinc-700/40">
        {filteredChildren}
      </div>
    </div>
  );
}

export function ShortcutInput({ value, onChange, onValidate }) {
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
    <button
      className={`px-3 py-1.5 rounded-lg text-xs font-mono min-w-[80px] transition-all ${
        error
          ? 'bg-red-500/20 text-red-400 border border-red-500 ring-2 ring-red-500/50'
          : recording
          ? 'bg-primary text-zinc-950 ring-2 ring-primary/50'
          : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
      }`}
      onClick={() => setRecording(true)}
      onKeyDown={recording ? handleKeyDown : undefined}
      onBlur={() => setRecording(false)}
    >
      {error ? 'Taken!' : recording ? '...' : value || 'None'}
    </button>
  );
}
