import React, { Component } from 'react';
import Button from 'material-ui/Button';

import { withRouter, BrowserRouter as Router, Route, NavLink, Link } from 'react-router-dom'

import AdminComponent from '../../../containers/Auth/Admin'
import ProtectedComponent from '../../../containers/Auth/Protected'
import LoginComponent from '../../../containers/Auth/Login'


import theme from './theme.scss'

import { logout } from '../../../actions/user'
import { userIsAuthenticatedRedir, userIsNotAuthenticatedRedir, userIsAdminRedir,
         userIsAuthenticated, userIsNotAuthenticated } from '../../../auth'

 const getUserName = user => {
   if (user.data) {
     return `Welcome ${user.data.name}`
   }
   return `Not logged in`
 }

 // Need to apply the hocs here to avoid applying them inside the render method
 const Login = userIsNotAuthenticatedRedir(LoginComponent)
 const Protected = userIsAuthenticatedRedir(ProtectedComponent)
 const Admin = userIsAuthenticatedRedir(userIsAdminRedir(AdminComponent))

 // Only show login when the user is not logged in and logout when logged in
 // Could have also done this with a single wrapper and `FailureComponent`
 const UserName = ({ user }) => (<div>{getUserName(user)}</div>)
 const LoginLink = userIsNotAuthenticated(() => <NavLink to="/login" className={theme.buttonLogin}><Button color="inherit">Auth</Button></NavLink>)
 const LogoutLink = userIsAuthenticated(({ logout }) => <Button color="inherit" onClick={() => logout()}>Logout</Button>)



import { connect } from 'react-redux';
import * as UserActions from '../../../actions/user';
import wrapActionCreators from '../../../utils/wrapActionCreators';
@connect(state => ({
    user: state.user
}), wrapActionCreators(UserActions))

class Header extends Component {

    // goToLocation(value) {
    //
    // <Button color="inherit" onClick={() => this.props.history.push(value)}>Auth</Button>
    // }

    // {LoginLink ? 'N' : <Button color="inherit" onClick={() => this.goToLocation('/login')}>Auth</Button>}
    // <LogoutLink />

  render() {
    const {user, logout} = this.props

    return (
      <div className={theme.bar}>
          <label>
              <UserName user={user} />
          </label>
          <LoginLink />
          <LogoutLink logout={logout} />
      </div>
    );
  }
}


export default withRouter(Header);


// <Link to="/protected">protected</Link>
// <Link to="/admin">admin</Link>
// <Link to="/"></Link>
//
// <div>
//
//     <LogoutLink logout={logout} />
//     <UserName user={user} />
// </div>
