const moment = require('moment')

export default {
  coins: ['ETH', 'BTC'],
  timestamps: [moment(+new Date()-2*60*60*1000).format('DD.MM.YY HH:mm'), moment(+new Date()-60*60*1000).format('DD.MM.YY HH:mm'), moment(+new Date()).format('DD.MM.YY HH:mm')],
  series: [
    {
      name: 'ETH',
      type: 'line',
      stack: '',
      areaStyle: {normal: {}},
      data: [100, 200, 50]
    },
    {
      name: 'BTC',
      type: 'line',
      stack: '',
      areaStyle: {normal: {}},
      data: [200, 400, 300]
    },
  ]
}
