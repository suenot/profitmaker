import React from 'react';
import {withRouter} from 'react-router';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {withStyles} from 'material-ui/styles';

import Typography from 'material-ui/Typography';
import Button from 'material-ui/Button';

import NumberFormat from 'react-number-format';
import Input from 'material-ui/Input';


import Preloader from '../../Preloader'
import {depositWeb3, withdrawalWeb3} from '../../../utils/getWeb3.js'

import theme from './theme.scss'

function NumberFormatCustom(props) {
  const { inputRef, onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      ref={inputRef}
      onValueChange={values => {
        onChange({
          target: {
            value: values.value,
          },
        });
      }}
      thousandSeparator
      prefix={`${props.prefix}  `}
    />
  );
}

NumberFormatCustom.propTypes = {
  inputRef: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};



const styles = theme => ({
  container: {},
  input: {
    margin: theme.spacing.unit,
  },
});

class Deposit extends React.Component {
  state = {
    deposit_open: false,
    deposit_value: 0,
    withdrawal_open: false,
    withdrawal_value: 0,
  };

  timeout = false
  clearTimer = () => {
      var that = this
      clearTimeout(that.timeout)
  }


  componentWillUnmount () {
      this.props.onRef(undefined)
      this.clearTimer()
  }

  componentDidMount() {
      this.props.onRef(this)
      this.applyDeposit(this.props.depositValue)
  }

  handleChange = name => event => {
    this.setState({
      [name]: event.target.value,
    });
  };


  handleClickOpen = (name) => {
    this.setState({ [name]: true });
  };

  handleClose = (name) => {
    this.setState({ [name]: false });
  };

  submitDeposit = () => {
      const {deposit_value} = this.state
      if(deposit_value > 0) {
          depositWeb3(deposit_value)
      }
      this.setState({ deposit_open: false });
  }

  submitWithdrawal = () => {
      const {withdrawal_value} = this.state
      if(withdrawal_value > 0) {
          withdrawalWeb3(withdrawal_value)
      }
      this.setState({ withdrawal_open: false });
  }




  renderFormDeposit() {
      const { classes } = this.props;
      const { deposit_value } = this.state;

      return (
        <div className={theme.depositContainer}>
            <Typography variant="button" gutterBottom>
                Deposit
            </Typography>

            <Input
              value={deposit_value}
              onChange={this.handleChange('deposit_value')}
              inputComponent={NumberFormatCustom}
              className={classes.input}
              fullWidth
              autoFocus
              inputProps={{
                'aria-label': 'Description',
                'prefix': 'ETH'
              }}
            />

            <div className={theme.depositActions}>
                <Button onClick={this.submitDeposit} color="primary" variant="raised">
                  Save
                </Button>
                <Button onClick={() => this.handleClose('deposit_open')} color="primary">
                  Cancel
                </Button>
            </div>
      </div>
      )
  }

  renderFormWithdrawal() {
      const { classes } = this.props;
      const { withdrawal_value } = this.state;

      return (
        <div className={theme.depositContainer}>
            <Typography variant="button" gutterBottom>
                Withdrawal
            </Typography>
            <Input
              value={withdrawal_value}
              onChange={this.handleChange('withdrawal_value')}
              inputComponent={NumberFormatCustom}
              className={classes.input}
              fullWidth
              autoFocus
              inputProps={{
                'aria-label': 'Description',
                'prefix': 'ETH'
              }}
            />
            <div className={theme.depositActions}>
                <Button onClick={this.submitWithdrawal} color="primary" variant="raised">
                  Save
                </Button>
                <Button onClick={() => this.handleClose('withdrawal_open')} color="primary">
                  Cancel
                </Button>
            </div>
      </div>
      )
  }

  render() {
    const { classes } = this.props;
    const { deposit_open, withdrawal_open } = this.state;

    // if(balance_disabled) {
    //     return <Preloader size={20} />
    // }
    return (
      <div className={theme.depositWrapper}>
          {!deposit_open && !withdrawal_open ?
              <div>
                <Button onClick={() => this.handleClickOpen('deposit_open')} className={classes.buttonApproved} size="small" variant="raised" color="primary">
                    Deposit
                </Button>
                <Button onClick={() => this.handleClickOpen('withdrawal_open')} className={classes.buttonApproved} size="small" color="primary">
                    Withdrawal
                </Button>
              </div>
          : ''}

        {deposit_open && this.renderFormDeposit()}

        {withdrawal_open && this.renderFormWithdrawal()}

      </div>
    );
  }
}

Deposit.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default
withRouter(
	(connect(
		(mapStateToProps) => (mapStateToProps),
		dispatch => ({
            // onToggleRightMenu: (payload) => {
			// 	dispatch({type: 'RIGHT_MENU_TOGGLE', payload})
			// },
		})
	))
	(withStyles(styles)(Deposit))
);
