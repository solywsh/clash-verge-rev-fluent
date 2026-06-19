import { Box, Typography } from "@mui/material";

// Shared grid template so the column header row (rules.tsx) and each rule row
// line up exactly: No. | Type | Value | Policy | Usage.
export const RULE_GRID_COLUMNS =
  "44px minmax(96px, 150px) minmax(0, 1fr) minmax(110px, 190px) 72px";

const COLOR = [
  "primary",
  "secondary",
  "info.main",
  "warning.main",
  "success.main",
];

interface Props {
  index: number;
  value: IRuleItem;
  // Approximate, runtime-accumulated hit count (see rule-hit-counter).
  usage?: number;
}

const parseColor = (text: string) => {
  if (text === "REJECT" || text === "REJECT-DROP") return "error.main";
  if (text === "DIRECT") return "text.primary";

  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    sum += text.charCodeAt(i);
  }
  return COLOR[sum % COLOR.length];
};

const RuleItem = (props: Props) => {
  const { index, value, usage } = props;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: RULE_GRID_COLUMNS,
        alignItems: "center",
        columnGap: 2,
        px: 2,
        py: 1,
        color: "text.primary",
        borderBottom: "1px solid var(--divider-color)",
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center" }}
      >
        {index}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        noWrap
        title={value.type}
      >
        {value.type}
      </Typography>

      <Typography
        variant="body2"
        noWrap
        title={value.payload}
        sx={{ userSelect: "text" }}
      >
        {value.payload || "-"}
      </Typography>

      <Typography
        variant="body2"
        noWrap
        title={value.proxy}
        color={parseColor(value.proxy)}
      >
        {value.proxy}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}
      >
        {usage ? usage : "-"}
      </Typography>
    </Box>
  );
};

export default RuleItem;
