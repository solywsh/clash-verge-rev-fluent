import { Dropdown, Option, useId } from "@fluentui/react-components";
import { Button, ButtonGroup } from "@mui/material";

interface Props {
  value?: string;
  onChange?: (value: string) => void;
}

export const StackModeSwitch = (props: Props) => {
  const { value, onChange } = props;

  return (
    <ButtonGroup size="small" sx={{ my: "4px" }}>
      <Button
        variant={value?.toLowerCase() === "system" ? "contained" : "outlined"}
        onClick={() => onChange?.("system")}
        sx={{ textTransform: "capitalize" }}
      >
        System
      </Button>
      <Button
        variant={value?.toLowerCase() === "gvisor" ? "contained" : "outlined"}
        onClick={() => onChange?.("gvisor")}
        sx={{ textTransform: "capitalize" }}
      >
        gVisor
      </Button>
      <Button
        variant={value?.toLowerCase() === "mixed" ? "contained" : "outlined"}
        onClick={() => onChange?.("mixed")}
        sx={{ textTransform: "capitalize" }}
      >
        Mixed
      </Button>
    </ButtonGroup>
  );
};

export function FluentModeSwitch(props: Props) {
  const { value, onChange } = props;
  const options = [
    { key: "system", text: "System" },
    { key: "gvisor", text: "gVisor" },
    { key: "mixed", text: "Mixed" },
  ];

  const selectText = options.find((option) => option.key === value)?.text;
  const id = useId("mode-switch");

  return (
    <Dropdown
      id={id}
      selectedOptions={[value!]}
      onOptionSelect={(ev, data) => onChange?.(data.selectedOptions[0])}
      value={selectText}
    >
      {options.map((option) => (
        <Option value={option.key} text={option.text}>
          {option.text}
        </Option>
      ))}
    </Dropdown>
  );
}
