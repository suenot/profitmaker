import React from 'react'
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles'
import MenuItem from '@material-ui/core/MenuItem'
import TextField from '@material-ui/core/TextField'
//
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Checkbox from '@material-ui/core/Checkbox'
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank'
import CheckBoxIcon from '@material-ui/icons/CheckBox'
import Favorite from '@material-ui/icons/Favorite'
import FavoriteBorder from '@material-ui/icons/FavoriteBorder'
//
import Button from '@material-ui/core/Button'
import { inject, observer } from 'mobx-react'

import 'element-theme-default'
import { Input } from 'element-react'

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

        <Input placeholder="Price" defaultValue={OrdersStore.createSellPrice} />
        <Input placeholder="Amount" defaultValue={OrdersStore.createSellAmount} />
        <p>Total: {OrdersStore.createSellTotal}</p>

      </div>
    )
  }
}

CreateOrder.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(CreateOrder)

// export default Sell
