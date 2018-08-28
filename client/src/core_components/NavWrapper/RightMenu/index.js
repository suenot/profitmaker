import React from 'react';
import {Link} from 'react-router-dom';
import PropTypes from 'prop-types';
import {withStyles} from 'material-ui/styles';

import ListSubheader from 'material-ui/List/ListSubheader';
import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List';
import Collapse from 'material-ui/transitions/Collapse';

import Divider from 'material-ui/Divider';
import Icon from 'material-ui/Icon';

import MetaMask from './MetaMask'
import UserData from './UserData'

const _ = require('lodash');

// import style from './theme';
const styles = theme => ({
	root: {
		width: '100%',
		maxWidth: 360,
		background: theme.palette.background.paper
	},
	nested: {
		paddingLeft: theme.spacing.unit * 4
	},
});

class RightMenu extends React.Component {

	state = {
		menu_user: true
	};


	componentWillReceiveProps(nextProps) {

		// Close account menu if user want to make deposit
		// if(nextProps.config.menu_right_account == false) {
		// 	this.setState({menu_user: false}, () => {})
		// 	console.log('hide user menu')
		// }
	}

	handleClick = (value) => {
		this.setState({ [value]: !this.state.menu_user });
	};


	render() {
		const { classes } = this.props;

		const metamask = this.props.config.web3Metamask
		let user_title = 'Account'
		if(metamask) {
			let user_balance = metamask.user_balance
				user_balance = Number(user_balance).toPrecision(8)
				user_title = `${user_title} (${user_balance}) ETH`
		}

		// return (<div></div>)

		return (
			<div>

				<ListItem button onClick={() => this.handleClick('menu_user')}>
					<ListItemIcon>
						<Icon>account_box</Icon>
					</ListItemIcon>
					<ListItemText inset primary={user_title}/>
					{this.state.menu_user ? <Icon>expand_less</Icon> : <Icon>expand_more</Icon>}
				</ListItem>
				<Collapse in={this.state.menu_user} timeout="auto">
					<div data-el="hideMenuInactive">
						<UserData />
					</div>
				</Collapse>

				<Divider/>

				<div data-el="hideMenuInactive">
					<MetaMask/>
				</div>

				<Divider/>


			</div>
		);
	}
}

RightMenu.propTypes = {
	classes: PropTypes.object.isRequired
};

export default withStyles(styles)(RightMenu);
