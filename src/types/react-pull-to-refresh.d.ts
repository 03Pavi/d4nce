declare module 'react-pull-to-refresh' {
  import * as React from 'react';

  export interface PullToRefreshProps {
    onRefresh: () => Promise<any>;
    icon?: React.ReactNode;
    loading?: React.ReactNode;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
    distanceToRefresh?: number;
    resistance?: number;
    hammerOptions?: any;
    children?: React.ReactNode;
  }

  export default class PullToRefresh extends React.Component<PullToRefreshProps> { }
}
