import React, { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-80 bg-terminal-bg border-l border-terminal-border flex flex-col">
        <SheetHeader className="h-12 px-0 py-3 bg-terminal-accent/60 flex-row items-center justify-between border-b border-terminal-border -mx-6 -mt-6 px-4">
          <SheetTitle className="text-sm font-medium text-terminal-text">{title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-0 -mx-6 px-4 py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsDrawer; 