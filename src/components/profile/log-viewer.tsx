import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Chip, Divider, Typography } from "@mui/material";
import { BaseDialog, BaseEmpty } from "@/components/base";

interface Props {
  open: boolean;
  logInfo: [string, string][];
  onClose: () => void;
}

export const LogViewer = (props: Props) => {
  const { open, logInfo, onClose } = props;

  const { t } = useTranslation();

  return (
    <BaseDialog
      open={open}
      title={t("Script Console")}
      okBtn={t("Close")}
      disableCancel
      contentSx={{
        width: 400,
        height: 300,
        overflowX: "hidden",
        userSelect: "text",
        pb: 1,
      }}
      onClose={onClose}
      onOk={onClose}
    >
      {logInfo.map(([level, log], index) => (
        <Fragment key={index.toString()}>
          <Typography color="text.secondary" component="div">
            <Chip
              label={level}
              size="small"
              variant="outlined"
              color={
                level === "error" || level === "exception" ? "error" : "default"
              }
              sx={{ mr: 1 }}
            />
            {log}
          </Typography>
          <Divider sx={{ my: 0.5 }} />
        </Fragment>
      ))}

      {logInfo.length === 0 && <BaseEmpty />}
    </BaseDialog>
  );
};
