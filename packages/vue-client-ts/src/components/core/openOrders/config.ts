import {WidgetConfig} from '@/types'

export default [
  {
    name: 'OpenOrders',
    component: 'OpenOrders',
    settings: '',
    settingsWidth: 300,
    img: 'core_components/OpenOrders/OpenOrders.png',
    title: 'Open orders',
    customTitle: '',
    description: 'My open orders',
    author: '#core',
    authorLink: 'https://github.com/kupi-network/kupi-terminal',
    source: '',
    demo: true,
    stock: undefined,
    pair: undefined,
    channel: 'default',
    channels: ['default', 'ccxt'],
    categories: ['Private api', 'Orders'],
  }
] as WidgetConfig[]
