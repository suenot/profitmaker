import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('GlobalStore')
@observer
class Pairs extends React.Component {
  render() {
    const {GlobalStore} = this.props
    return (
      <div>
        <table>
          <tbody>
            {
              _.map(GlobalStore.pairs, (pair) => {
                return <tr key={pair}>
                  <td><a href="#" onClick={this.handleClick.bind(this, pair)}>{pair}</a></td>
                </tr>
              })
            }
          </tbody>
        </table>
      </div>
    )
  }
  handleClick(pair) {
    this.props.GlobalStore.setPair(pair)
  }
}

export default Pairs
