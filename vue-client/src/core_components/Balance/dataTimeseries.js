const moment = require('moment')

export default {
  coins: ['ETH', 'BTC', 'OTHER'],
  timestamps: [moment(+new Date()-2*60*60*1000).format('DD.MM.YY HH:mm'), moment(+new Date()-60*60*1000).format('DD.MM.YY HH:mm'), moment(+new Date()).format('DD.MM.YY HH:mm')],
  series: [
    {
      name: 'ETH',
      type: 'line',
      stack: 'group1',
      itemStyle: {normal: {areaStyle: {type: 'default'}}},
      data: [100, 50, 10, 300]
    },
    {
      name: 'BTC',
      type: 'line',
      stack: 'group1',
      itemStyle: {normal: {areaStyle: {type: 'default'}}},
      data: [0, 100, 300, 200]
    },
    {
      name: 'OTHER',
      type: 'line',
      stack: 'group1',
      itemStyle: {normal: {areaStyle: {type: 'default'}}},
      data: [200, 400, 300, 200]
    },
  ]
}
