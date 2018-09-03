import React from 'react'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles'
import { inject, observer } from 'mobx-react'

import 'element-theme-default'
import { Input, Button } from 'element-react'

const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  textField: {
    marginLeft: theme.spacing.unit,
    marginRight: theme.spacing.unit,
    width: 200,
  },
  menu: {
    width: 200,
  },
})

@inject('OrdersStore')
@observer
class CreateOrder extends React.Component {
  render() {
    const {OrdersStore, classes, type} = this.props
    return (
      <div>
        <p>
          <div className="text">Price</div>
          <Input placeholder="Price" value={OrdersStore.createPrice[type]} onChange={this.changeValue.bind(this, 'price', type)} />
        </p>
        <p>
          <div className="text">Amount</div>
          <Input placeholder="Amount" value={OrdersStore.createAmount[type]} onChange={this.changeValue.bind(this, 'amount', type)} />
        </p>
        <p>
          <div className="text">Total</div>
          <Input placeholder="Total" value={OrdersStore.createTotal[type]} onChange={this.changeValue.bind(this, 'total', type)} />
        </p>
        <p>
          <Button type={type === 'buy' ? 'success' : 'danger'} onClick={this.createOrder.bind(this, type)}>{type}</Button>
        </p>
      </div>
    )
  }
  changeValue(field, type, value) {
    this.props.OrdersStore.createChange(value, field, type)
  }
  createOrder(type) {
    this.props.OrdersStore.createOrder(type)
  }
}

CreateOrder.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(CreateOrder)