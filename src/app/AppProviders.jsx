import { SettingsProvider } from '../contexts/SettingsContext';
import { TooltipProvider } from '@ui/tooltip';

export function AppProviders({ children }) {
  return (
    <SettingsProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </SettingsProvider>
  );
}
