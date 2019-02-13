import React from 'react';
import { MenuItem } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';
import { get, SlackUser } from './SlackApi';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';

interface UserSelectorProps {
  userId?: string;
  onSelect: (user?: SlackUser) => void;
}

interface UserSelectorState {
  users: SlackUser[];
}

export class UserSelector extends React.Component<UserSelectorProps, UserSelectorState> {
  state: UserSelectorState = { users: [] };

  componentWillMount() {
    get('users.list').then(rsp => {
      this.setState({ users: rsp.members });
    });
  }

  render() {
    return (
      <FormControl className="UserSelector">
        <InputLabel shrink>User</InputLabel>
        <Select
          value={this.props.userId}
          onChange={id =>
            id && this.props.onSelect(this.state.users.filter(u => u.id === id.target.value)[0])
          }
          name="age"
          displayEmpty
        >
          <MenuItem value="">All Users</MenuItem>
          {this.state.users
            .sort((a, b) => userName(a).localeCompare(userName(b)))
            .map(user => (
              <MenuItem className="UserListItem" key={user.id} value={user.id}>
                <Avatar
                  className="UserListItem-Avatar"
                  style={{ width: 24, height: 24, marginTop: -4, marginBottom: -1, marginLeft: 4 }}
                >
                  <img
                    src={user.profile.image_48}
                    style={{ width: 24, height: 24 }}
                    alt={userName(user)}
                  />
                </Avatar>
                <span className="UserListItem-Name">{userName(user)}</span>
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    );
  }
}

function userName(user: SlackUser) {
  return user.profile.display_name || user.name;
}
