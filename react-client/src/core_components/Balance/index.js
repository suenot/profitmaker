import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'
import moment from 'moment'

// import ReactEcharts from 'echarts-for-react'

@inject('BalanceStore')
@observer
class Balance extends React.Component {
  // getOption() {
  //   return option
  // }
  render() {
    const {BalanceStore, data} = this.props
    const {total} = data
    if (!BalanceStore.stock) {
      return (<div></div>)
    }
    var balanceData = total ? BalanceStore['balanceTotal'] : BalanceStore['balanceStock']

    // console.log(stock)
    return (
      <div>
        {/* <ReactEcharts
          option={this.getOption()}
          style={{height: '350px', width: '100%'}}
          className='react_for_echarts'
        /> */}
        <table className="simpleTable">
          <thead>
            <tr>
              <th colSpan="1" className="simpleTable-header">{moment(balanceData.datetime).format('DD.MM.YY HH:mm:ss') || 0}</th>
              <th colSpan="1" className="simpleTable-header">{(balanceData.totalBTC || 0).toFixed(8)} BTC</th>
              <th colSpan="2" className="simpleTable-header">{(balanceData.totalUSD || 0).toFixed(2)} USD</th>
            </tr>
            <tr>
              <th>coins</th>
              <th>on orders</th>
              <th>BTC</th>
              <th>USD</th>
            </tr>
          </thead>
          <tbody>
            {

              _.map(balanceData.data, (item) => {

                return (
                  <tr key={item.shortName}>
                    <td>
                      {(item.free || 0).toFixed(8)} {item.shortName}
                    </td>
                    <td>
                      {(item.used || 0).toFixed(8)}
                    </td>
                    <td>
                      {(item.totalBTC || 0).toFixed(8)}
                    </td>
                    <td>
                      {(item.totalUSD || 0).toFixed(2)}
                    </td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>





      </div>
    )
  }
}

export default Balance




// var data = genData(50);

// function genData(count) {
//   var nameList = [
//       '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许', '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏', '陶', '姜', '戚', '谢', '邹', '喻', '柏', '水', '窦', '章', '云', '苏', '潘', '葛', '奚', '范', '彭', '郎', '鲁', '韦', '昌', '马', '苗', '凤', '花', '方', '俞', '任', '袁', '柳', '酆', '鲍', '史', '唐', '费', '廉', '岑', '薛', '雷', '贺', '倪', '汤', '滕', '殷', '罗', '毕', '郝', '邬', '安', '常', '乐', '于', '时', '傅', '皮', '卞', '齐', '康', '伍', '余', '元', '卜', '顾', '孟', '平', '黄', '和', '穆', '萧', '尹', '姚', '邵', '湛', '汪', '祁', '毛', '禹', '狄', '米', '贝', '明', '臧', '计', '伏', '成', '戴', '谈', '宋', '茅', '庞', '熊', '纪', '舒', '屈', '项', '祝', '董', '梁', '杜', '阮', '蓝', '闵', '席', '季', '麻', '强', '贾', '路', '娄', '危'
//   ];
//   var legendData = [];
//   var seriesData = [];
//   var selected = {};
//   for (var i = 0; i < 50; i++) {
//       var name = Math.random() > 0.65
//           ? makeWord(4, 1) + '·' + makeWord(3, 0)
//           : makeWord(2, 1);
//       legendData.push(name);
//       seriesData.push({
//           name: name,
//           value: Math.round(Math.random() * 100000)
//       });
//       selected[name] = i < 6;
//   }

//   return {
//       legendData: legendData,
//       seriesData: seriesData,
//       selected: selected
//   };

//   function makeWord(max, min) {
//       var nameLen = Math.ceil(Math.random() * max + min);
//       var name = [];
//       for (var i = 0; i < nameLen; i++) {
//           name.push(nameList[Math.round(Math.random() * nameList.length - 1)]);
//       }
//       return name.join('');
//   }
// }

// var option = {
//   title : {
//       text: '同名数量统计',
//       subtext: '纯属虚构',
//       x:'center'
//   },
//   tooltip : {
//       trigger: 'item',
//       formatter: "{a} <br/>{b} : {c} ({d}%)"
//   },
//   legend: {
//       type: 'scroll',
//       orient: 'vertical',
//       right: 10,
//       top: 20,
//       bottom: 20,
//       data: data.legendData,
//       selected: data.selected
//   },
//   series : [
//       {
//           name: '姓名',
//           type: 'pie',
//           radius : '55%',
//           center: ['40%', '50%'],
//           data: data.seriesData,
//           itemStyle: {
//               emphasis: {
//                   shadowBlur: 10,
//                   shadowOffsetX: 0,
//                   shadowColor: 'rgba(0, 0, 0, 0.5)'
//               }
//           }
//       }
//   ]
// };
