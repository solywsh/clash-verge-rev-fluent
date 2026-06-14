import {
  Tooltip,
  IconButton,
  IconButtonProps,
  SvgIconProps,
} from "@mui/material";
import { InfoRounded } from "@mui/icons-material";
import { Button, Tooltip as FluentTooltip } from "@fluentui/react-components";
import { InfoRegular } from "@fluentui/react-icons";

interface Props extends IconButtonProps {
  title?: string;
  icon?: React.ElementType<SvgIconProps>;
}

export const TooltipIcon: React.FC<Props> = (props: Props) => {
  const { title = "", icon: Icon = InfoRounded, ...restProps } = props;

  return (
    <Tooltip title={title} placement="top">
      <IconButton color="inherit" size="small" {...restProps}>
        <Icon fontSize="inherit" style={{ cursor: "pointer", opacity: 0.75 }} />
      </IconButton>
    </Tooltip>
  );
};

export function FluentTooltipIcon(props: Props) {
  const { icon: _icon = <InfoRegular style={{ marginLeft: 4 }} />, onClick } =
    props;
  const icon = _icon as any;

  const content = onClick ? (
    <Button appearance="subtle" size="small" icon={icon}></Button>
  ) : (
    icon
  );

  if (!props.title) {
    return content;
  }

  return (
    <FluentTooltip content={props.title ?? ""} relationship="label">
      {content}
    </FluentTooltip>
  );
}
