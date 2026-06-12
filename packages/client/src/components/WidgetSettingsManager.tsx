import React from 'react';
import SettingsDrawer from './SettingsDrawer';
import { useSettingsDrawerStore } from '@/store/settingsDrawerStore';
import { useWidgetRegistry } from '@/modules/registry';

const WidgetSettingsManager: React.FC = () => {
  const { isOpen, widgetId, widgetType, widgetTitle, groupId, closeDrawer } = useSettingsDrawerStore();
  const getDefinition = useWidgetRegistry(s => s.getDefinition);

  const renderSettings = () => {
    if (!widgetId || !widgetType) return null;

    const definition = getDefinition(widgetType);
    const Settings = definition?.Settings;
    if (!Settings) {
      return <div className="text-terminal-muted">No settings available for this widget</div>;
    }
    return <Settings widgetId={widgetId} groupId={groupId || undefined} />;
  };

  return (
    <SettingsDrawer
      isOpen={isOpen}
      onClose={closeDrawer}
      title={`${widgetTitle || 'Widget'} Settings`}
    >
      {renderSettings()}
    </SettingsDrawer>
  );
};

export default WidgetSettingsManager; 