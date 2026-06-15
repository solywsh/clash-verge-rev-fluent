import React from "react";
import { Box, styled } from "@mui/material";
import { tokens } from "@/pages/_fluent_theme";

type Props = {
  label: string;
  fontSize?: string;
  width?: string;
  padding?: string;
  children?: React.ReactNode;
};

export const BaseFieldset: React.FC<Props> = (props: Props) => {
  const Fieldset = styled(Box)<{ component?: string }>(() => ({
    position: "relative",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    width: props.width ?? "auto",
    padding: props.padding ?? "15px",
  }));

  // The legend sits on the top border; a matching background + small inset
  // masks the border behind the text. NB: `left` must be a single length —
  // never `props.padding` (which may be a shorthand like "15px 10px").
  const Label = styled("legend")(() => ({
    position: "absolute",
    top: "-10px",
    left: "10px",
    padding: "0 4px",
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontSize: props.fontSize ?? "1em",
  }));

  return (
    <Fieldset component="fieldset">
      <Label>{props.label}</Label>
      {props.children}
    </Fieldset>
  );
};
