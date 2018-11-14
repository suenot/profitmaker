module.exports = [
  {
    name: 'candles',
    component: 'core_components/ReactStockcharts/HeikinAshi/index.js',
    settings: 'core_components/ReactStockcharts/HeikinAshi/Settings.js',
    settingsWidth: '300px',
    img: 'core_components/ReactStockcharts/HeikinAshi/HeikinAshi.png',
    header: 'Candles',
    customHeader: '',
    description: 'Open-High-Low-Close-Value candles chart',
    author: '#core',
    authorLink: 'https://github.com/kupi-network/kupi-terminal',
    source: 'https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/ReactStockcharts/HeikinAshi/index.js',
    data: {stock: 'BINANCE', pair: 'ETH_BTC', timeframe: '1m'}
  }
]
