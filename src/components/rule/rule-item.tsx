import { Box, Typography } from "@mui/material";
import { Checkbox } from "@fluentui/react-components";

// Shared grid template so the column header row (rules.tsx) and each rule row
// line up exactly: [✓] | No. | Type | Value | Policy | Usage.
export const RULE_GRID_COLUMNS =
  "36px 44px minmax(96px, 150px) minmax(0, 1fr) minmax(110px, 190px) 72px";

const COLOR = [
  "primary",
  "secondary",
  "info.main",
  "warning.main",
  "success.main",
];

interface Props {
  index: number | string;
  value: IRuleItem;
  // Approximate, runtime-accumulated hit count (see rule-hit-counter).
  usage?: number;
  // Whether this rule is currently active (unchecked = disabled, dimmed).
  enabled?: boolean;
  // Whether the enable/disable checkbox can be operated for this rule. Rules
  // that don't map to a source line (rule-set expansions, merge/builtin/logic)
  // can't be toggled here.
  toggleable?: boolean;
  toggleHint?: string;
  onToggle?: () => void;
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
  const {
    index,
    value,
    usage,
    enabled = true,
    toggleable = false,
    toggleHint,
    onToggle,
  } = props;

  // Dim every column except the checkbox so the row reads as "off" but stays
  // operable.
  const dim = enabled ? 1 : 0.4;

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
      <Box
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        title={!toggleable ? toggleHint : undefined}
      >
        <Checkbox
          checked={enabled}
          disabled={!toggleable}
          onChange={() => onToggle?.()}
          // Stop the row's other handlers / text-selection from interfering.
          onClick={(e) => e.stopPropagation()}
        />
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", opacity: dim }}
      >
        {index}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        noWrap
        title={value.type}
        sx={{ opacity: dim }}
      >
        {value.type}
      </Typography>

      <Typography
        variant="body2"
        noWrap
        title={value.payload}
        sx={{ userSelect: "text", opacity: dim }}
      >
        {value.payload || "-"}
      </Typography>

      <Typography
        variant="body2"
        noWrap
        title={value.proxy}
        color={parseColor(value.proxy)}
        sx={{ opacity: dim }}
      >
        {value.proxy}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          opacity: dim,
        }}
      >
        {usage ? usage : "-"}
      </Typography>
    </Box>
  );
};

export default RuleItem;
