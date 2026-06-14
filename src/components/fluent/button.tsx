import {
  Button as ParentButton,
  ButtonProps,
  makeStyles,
  MenuButton as ParentMenuButton,
  MenuButtonProps,
} from "@fluentui/react-components";

export function MenuButton(props: MenuButtonProps) {
  return <ParentMenuButton {...props} />;
}
