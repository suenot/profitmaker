import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {withRouter} from 'react-router';
import {connect} from 'react-redux';
import {withStyles} from 'material-ui/styles';

import Typography from 'material-ui/Typography';
import Divider from 'material-ui/Divider';
import Button from 'material-ui/Button';

// import NumberFormat from 'react-number-format';
import Blockies from 'react-blockies';


import Preloader from '../../Preloader';
import UserDataDeposit from './UserDataDeposit';

import {getWeb3} from '../../../utils/getWeb3'
// import {getEtherscan} from '../../utils/functions'
// import getWeb3 from '../../utils/getWeb3_old'

const _ = require('lodash');
import theme from './theme.scss'



const styles = theme => ({
});

class UserData extends React.Component {

	state = {
		timer: 5,
		// token_balance: 0
	};

	componentDidMount() {
		this.callWeb3Timer()
	}

	// componentWillReceiveProps(nextProps) {
	// 	if(this.props.config.web3Metamask.contract_balance != nextProps.config.web3Metamask.contract_balance) {
	// 		alert('new!')
	// 	}
	// }


	// componentWillUnmount () {
    //   this.clearTimer()
    // }

	// initDepositWeb3(value) {
	//
	// 	const that = this
	// 	let result = depositWeb3(value).then((res) => {
	// 		if(res) {
	// 			console.log('TUT')
	// 			console.log(res)
	//
	// 			let data = {
	// 				user_address: that.props.config.web3Metamask.user_address,
	// 				transactions: {
	// 					value: value,
	// 					hash: res,
	// 				}
	// 			}
	// 			that.props.onSaveWeb3Transactions(data)
	// 		}
	// 	})
	//
	// }

	timeout = false
    clearTimer = () => {
        var that = this
        clearTimeout(that.timeout)
    }

	callWeb3Timer() {
		const that = this

		let timer = this.state.timer - 1

		if(timer == -1) {
			timer = 5
			this.callWeb3()
		}
		this.setState({timer})

		this.timeout = setTimeout(function() {
			that.callWeb3Timer()
		}, 1000)
	}

	async callWeb3() {
		// Get network provider and web3 instance.
		// See utils/getWeb3 for more info.

		const that = this
		let data = await getWeb3().then((res) => {
			if(res) {
				that.props.onSaveWeb3Metamask(res)
			} else {
				console.log('MetaMask not logged.')
			}
		})
		.catch((err) => {
			console.log(err)
			console.log('Error finding web3.')
			// let data = {status: 'Error finding web3.'}
			// that.props.onSaveWeb3Metamask(data)
		})

	}


	renderMetamask() {
		const metamask = this.props.config.web3Metamask
		let transactions = this.props.config.web3Transactions
		if(transactions) {
			transactions = transactions[metamask.user_address]
		}

		let balance = Number(metamask.user_balance)
			balance = balance.toPrecision(8)
		let contract_balance = Number(metamask.contract_balance)
			contract_balance = contract_balance.toPrecision(8)

		return (
			<div>

				<ul data-el="header">
					<li>
						<div>
							<Blockies
								seed={metamask.user_address}
								size={5}
								scale={7}
								color="#3f51b5"
								bgColor="#fff"
								spotColor="#FF4081"
							  />
				  		</div>
					</li>
					<li>
						<Typography variant="title">
							MetaMask <br />activated! {`(${this.state.timer})`}
						</Typography>
					</li>
				</ul>

				<ul data-el="userData">
					<li>
						<label>Address</label>
						<span data-el="link" onClick={() => window.open(`https://etherscan.io/address/${metamask.user_address}`)}>
							{metamask.user_address}
						</span>
					</li>
					<li>
						<label>Wallet</label>
						<span>{balance} ETH</span>
					</li>
					<li>
						<label>Deposit</label>
						<span>{contract_balance} ETH</span>
					</li>
					<li>
						<label>Ethplorer</label>
						<span>{metamask.ethplorer.countTxs} transactions</span>
					</li>
				</ul>

				<UserDataDeposit />

			</div>
		)
	}

	render() {


        if(!this.props.config.web3Metamask) {
            return (
                <div className={theme.checking}>
					<Preloader data-el="preloader" />
                    <Typography variant="title" gutterBottom align="center">
                        Checking MetaMask...
                    </Typography>
					<p>
						<a href="/plugin/app.zip" target="_blank">Install MetaMask</a> plugin if not installed or refresh page...
					</p>
                </div>
            )
        }

		return (
			<div className={theme.wrapper}>
				{this.renderMetamask()}
			</div>
		);
	}
}

UserData.propTypes = {
	// classes: PropTypes.object.isRequired
};

// export default withStyles(styles)(Web3Data);


export default
withRouter(
	(connect(
		(mapStateToProps) => (mapStateToProps),
		dispatch => ({
            onSaveWeb3Metamask: (payload) => {
				dispatch({type: 'SAVE_WEB3_METAMASK', payload})
			},
			onSaveWeb3Transactions: (payload) => {
				dispatch({type: 'SAVE_WEB3_TRANSACTIONS', payload})
			},
		})
	))
	(UserData)
);
