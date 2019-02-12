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
  onLoad: () => void;
}

export class AutoScroll extends React.Component<AutoScrollProps> {
  scrollHandler: any;
  scrollParent: HTMLElement | Window | null = null;

  componentDidMount() {
    const n = ReactDOM.findDOMNode(this) as HTMLElement;
    this.scrollParent = getScrollParent(n, true);
    if (this.scrollParent === window) {
      this.scrollHandler = () => {
        if (
          window.innerHeight + document.documentElement.scrollTop ===
          document.documentElement.offsetHeight
        ) {
          this.props.onLoad();
        }
      };
    } else {
      this.scrollHandler = () => {
        var style = window.getComputedStyle(this.scrollParent as HTMLElement, null);
        const innerHeight = parseInt(style.getPropertyValue('height'));
        const scrollTop = parseInt(style.getPropertyValue('scrollTop'));
        const offsetHeight = parseInt(style.getPropertyValue('offsetHeight'));
        if (innerHeight + scrollTop === offsetHeight) {
          this.props.onLoad();
        }
      };
    }
    this.scrollParent.addEventListener('scroll', this.scrollHandler);
  }

  componentWillUnmount() {
    this.scrollParent!.removeEventListener('scroll', this.scrollHandler);
  }

  render() {
    return <div>{this.props.children}</div>;
  }
}
