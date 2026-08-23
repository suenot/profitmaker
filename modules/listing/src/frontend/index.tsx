import { defineModule } from '@profitmaker/module-sdk';
import type { WidgetDefinition } from '@profitmaker/module-sdk';
import { LiveListingsWidget } from './LiveListings';
import { LiveListingsSettings } from './LiveListingsSettings';
import { TrendsWidget } from './Trends';
import './style.css';

const liveListings: WidgetDefinition = {
  type: 'listing.live',
  title: 'Live Listings',
  icon: 'Zap',
  category: 'modules',
  defaultSize: { width: 420, height: 420 },
  showGroupSelector: false,
  needsTransparentGroup: true,
  Component: LiveListingsWidget,
  Settings: LiveListingsSettings,
};

const trends: WidgetDefinition = {
  type: 'listing.trends',
  title: 'Listing Trends',
  icon: 'TrendingUp',
  category: 'modules',
  defaultSize: { width: 380, height: 420 },
  showGroupSelector: false,
  needsTransparentGroup: true,
  Component: TrendsWidget,
};

export default defineModule({ id: 'listing', widgets: [liveListings, trends] });
