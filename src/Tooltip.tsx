import {WithStyles} from "@material-ui/core";
import MTooltip, {TooltipProps} from "@material-ui/core/Tooltip";
import withStyles from "@material-ui/core/styles/withStyles";
import React from "react";
import createStyles from "@material-ui/core/styles/createStyles";

const styles = createStyles({
    popper: arrowGenerator('#000'),
    tooltip: {
        backgroundColor: '#000',
        fontSize: '1.1em',
    },
    arrow: {
        position: 'absolute',
        top: '50%',
        marginTop: '-1.0em',
        fontSize: 6,
        width: '3em',
        height: '3em',
        '&::before': {
            content: '""',
            margin: 'auto',
            display: 'block',
            width: 0,
            height: 0,
            borderStyle: 'solid',
        },
    },
});


function arrowGenerator(color: string) {
    return {
        '&[x-placement*="bottom"] $arrow': {
            top: 0,
            left: 0,
            marginTop: '-0.5em',
            width: '3em',
            height: '1em',
            '&::before': {
                borderWidth: '0 1em 1em 1em',
                borderColor: `transparent transparent ${color} transparent`,
            },
        },
        '&[x-placement*="top"] $arrow': {
            bottom: 0,
            left: 0,
            marginBottom: '-0.5em',
            width: '3em',
            height: '1em',
            '&::before': {
                borderWidth: '1em 1em 0 1em',
                borderColor: `${color} transparent transparent transparent`,
            },
        },
        '&[x-placement*="right"] $arrow': {
            left: 0,
            marginLeft: '-0.95em',
            height: '3em',
            width: '1em',
            '&::before': {
                borderWidth: '1em 1em 1em 0',
                borderColor: `transparent ${color} transparent transparent`,
            },
        },
        '&[x-placement*="left"] $arrow': {
            right: 0,
            marginRight: '-0.95em',
            height: '3em',
            width: '1em',
            '&::before': {
                borderWidth: '1em 0 1em 1em',
                borderColor: `transparent transparent transparent ${color}`,
            },
        },
    };
}

interface Props extends TooltipProps {
    classes: any;
}

export const Tooltip = withStyles(styles)(class extends React.Component<Props> {
    arrowRef?: any;

    render() {
        const {children, title, classes} = this.props;
        return (
            <MTooltip
                classes={{
                    popper: classes.popper,
                    tooltip: classes.tooltip,
                } as any}
                placement={this.props.placement || "right"}
                title={
                    <React.Fragment>
                        <span className={classes.arrow} ref={r => this.arrowRef = r}/>
                        {title}
                    </React.Fragment>
                }
                PopperProps={{
                    popperOptions: {
                        modifiers: {
                            flip: {
                                enabled: true,
                            },
                            preventOverflow: {
                                enabled: true,
                                boundariesElement: 'scrollParent',
                            },
                            arrow: {
                                enabled: Boolean(this.arrowRef),
                                element: this.arrowRef,
                            },
                        }
                    },
                }}
            >
                {children}
            </MTooltip>
        );
    }
});
