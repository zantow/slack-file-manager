import React from 'react';
import ReactDOM from 'react-dom';

function getScrollParent(element: HTMLElement, includeHidden: boolean) {
  let style = getComputedStyle(element)!;
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;

  if (style.position === 'fixed') return document.body;
  for (let parent: HTMLElement | null = element; (parent = parent.parentElement); ) {
    style = getComputedStyle(parent)!;
    if (excludeStaticParent && style.position === 'static') {
      continue;
    }
    if (overflowRegex.test(style.overflow! + style.overflowY! + style.overflowX)) return parent;
  }
  return window;
}

interface AutoScrollProps {
  children: any;
  onLoad: () => Promise<any>;
}

export class AutoScroll extends React.Component<AutoScrollProps> {
  scrollHandler: any;
  scrollParent: HTMLElement | Window | null = null;
  scrollPercent?: () => number;
  loading = false;

  componentDidMount() {
    const n = ReactDOM.findDOMNode(this) as HTMLElement;
    this.scrollParent = getScrollParent(n, true);
    if (this.scrollParent === window) {
      this.scrollPercent = () =>
        (window.innerHeight + document.documentElement.scrollTop) /
        document.documentElement.offsetHeight;
    } else {
      this.scrollPercent = () => {
        var style = window.getComputedStyle(this.scrollParent as HTMLElement, null);
        const innerHeight = parseInt(style.getPropertyValue('height'));
        const scrollTop = parseInt(style.getPropertyValue('scrollTop'));
        const offsetHeight = parseInt(style.getPropertyValue('offsetHeight'));
        return (innerHeight + scrollTop) / offsetHeight;
      };
    }
    this.scrollHandler = () => {
      if (!this.loading) {
        if (this.scrollPercent!() > 0.9) {
          this.loading = true;
          this.props.onLoad().then(() => (this.loading = false));
        }
      }
    };
    this.scrollParent.addEventListener('scroll', this.scrollHandler);
  }

  componentWillUnmount() {
    this.scrollParent!.removeEventListener('scroll', this.scrollHandler);
  }

  render() {
    return <div>{this.props.children}</div>;
  }
}
