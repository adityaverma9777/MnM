'use client';

export const dynamic = 'force-dynamic';

import { AppProvider, useApp } from '@/components/AppProvider';
import PasswordGate from '@/components/PasswordGate';
import IdentitySelector from '@/components/IdentitySelector';
import ModeSelector from '@/components/ModeSelector';
import FileManager from '@/components/FileManager';
import LocalFileSelector from '@/components/LocalFileSelector';
import WatchRoom from '@/components/WatchRoom';

function AppContent() {
  const { view } = useApp();

  switch (view) {
    case 'password':
      return <PasswordGate />;
    case 'identity':
      return <IdentitySelector />;
    case 'modeselect':
      return <ModeSelector />;
    case 'dashboard':
      return <FileManager />;
    case 'localfile':
      return <LocalFileSelector />;
    case 'watchroom':
      return <WatchRoom />;
    default:
      return <PasswordGate />;
  }
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
