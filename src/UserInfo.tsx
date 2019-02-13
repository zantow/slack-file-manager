import { get, SlackUser, userCache } from './SlackApi';
import React from 'react';
import { Tooltip } from './Tooltip';
import { Avatar } from '@material-ui/core';

interface UserInfoProps {
  userId: string;
}

interface UserInfoState {
  user?: SlackUser;
}

export class UserInfo extends React.Component<UserInfoProps, UserInfoState> {
  state: UserInfoState = {};
  arrowRef?: any;

  componentWillMount(): void {
    const user = userCache[this.props.userId];
    if (!user) {
      get('users.info', {
        user: this.props.userId,
      }).then(rsp => {
        this.setState({ user: userCache[rsp.user.id] = rsp.user });
      });
    } else {
      this.setState({ user });
    }
  }

  render() {
    const { user } = this.state;
    if (!user)
      return (
        <Avatar>
          <Tooltip placement="right" title={<React.Fragment>{this.props.userId}</React.Fragment>}>
            <span>{this.props.userId}</span>
          </Tooltip>
        </Avatar>
      );
    const userName = user.profile.display_name || user.name;
    const children = user.profile.image_48 ? (
      <img src={user.profile.image_48} alt={userName} />
    ) : (
      <span>{userName}</span>
    );
    return (
      <Avatar>
        <Tooltip placement="right" title={<React.Fragment>{userName}</React.Fragment>}>
          {children}
        </Tooltip>
      </Avatar>
    );
  }
}
