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

@inject('CreateOrderStore')
@observer
class CreateOrder extends React.Component {
  render() {
    const {CreateOrderStore, classes} = this.props
    return (
      <div>
        <div class="header">Sell</div>
        <form className={classes.container} noValidate autoComplete="off" onSubmit={this.sellAll}>
          <TextField
            id="price"
            label="Price"
            className={classes.textField}
            value={CreateOrderStore.price}
            onChange={console.log('changed')}
            margin="normal"
          />
          <TextField
            id="amount"
            label="Amount"
            className={classes.textField}
            value={CreateOrderStore.amount}
            onChange={console.log('changed')}
            margin="normal"
          />
          <TextField
            id="minAmount"
            label="Min amount"
            className={classes.textField}
            value={CreateOrderStore.minAmount}
            onChange={console.log('changed')}
            margin="normal"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={CreateOrderStore.unencumbered}
                onChange={console.log('changed')}
                value="checkedBalance"
                color="primary"
              />
            }
            label="Place order on unencumbered balance"
          />
          <Button variant="contained" color="primary" className={classes.button} fullWidth="true" type="submit">Sell</Button>
          <ul>
            <li>{CreateOrderStore.result}</li>
            <li>{CreateOrderStore.orders}</li>
            <li>{CreateOrderStore.rebateAddress}</li>
          </ul>
        </form>
      </div>
    )
  }
}

CreateOrder.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(CreateOrder)

// export default Sell