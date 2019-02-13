import React from 'react';

interface Props {}
interface State {
  error: Error | null;
}

export class ErrorDisplay extends React.Component<Props, State> {
  state: State = { error: null };

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error });
  }

  render() {
    if (this.state.error) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
