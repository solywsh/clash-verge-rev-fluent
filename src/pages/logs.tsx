import { useMemo, useState } from "react";
import { Box, Button, IconButton, MenuItem } from "@mui/material";
import { Virtuoso } from "react-virtuoso";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "foxact/use-local-storage";
import {
  Button as FluentButton,
  MenuButton,
  Menu,
  MenuTrigger,
  TabList,
  Tab,
  MenuPopover,
  MenuList,
  MenuItemRadio,
} from "@fluentui/react-components";
import { tokens } from "./_fluent_theme";
import { PauseCircleRegular, PlayCircleRegular } from "@fluentui/react-icons";
import {
  PlayCircleOutlineRounded,
  PauseCircleOutlineRounded,
} from "@mui/icons-material";
import { useLogData, LogLevel, clearLogs } from "@/hooks/use-log-data";
import { useEnableLog } from "@/services/states";
import { BaseEmpty, BasePage } from "@/components/base";
import LogItem from "@/components/log/log-item";
import { useTheme } from "@mui/material/styles";
import { FluentBaseSearchBox as BaseSearchBox } from "@/components/base/base-search-box";
import { BaseStyledSelect } from "@/components/base/base-styled-select";
import { SearchState } from "@/components/base/base-search-box";

const LogPage = () => {
  const { t } = useTranslation();
  const [enableLog, setEnableLog] = useEnableLog();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [logLevel, setLogLevel] = useLocalStorage<LogLevel>(
    "log:log-level",
    "info",
  );
  const [match, setMatch] = useState(() => (_: string) => true);
  const logData = useLogData(logLevel);
  const [searchState, setSearchState] = useState<SearchState>();

  const filterLogs = useMemo(() => {
    return logData
      ? logData.filter((data) =>
          logLevel === "all"
            ? match(data.payload)
            : data.type.includes(logLevel) && match(data.payload),
        )
      : [];
  }, [logData, logLevel, match]);

  return (
    <BasePage
      full
      title={t("Logs")}
      contentStyle={{ height: "100%" }}
      header={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* <IconButton
            title={t("Pause")}
            size="small"
            color="inherit"
            onClick={() => setEnableLog((e) => !e)}
          >
            {enableLog ? (
              <PauseCircleOutlineRounded />
            ) : (
              <PlayCircleOutlineRounded />
            )}
          </IconButton> */}
          <FluentButton
            onClick={() => setEnableLog((e) => !e)}
            icon={enableLog ? <PauseCircleRegular /> : <PlayCircleRegular />}
            appearance="subtle"
            size="small"
          />
          {enableLog === true && (
            <FluentButton
              onClick={() => {
                clearLogs(logLevel);
              }}
              className="fds"
            >
              {t("Clear")}
            </FluentButton>
          )}
        </Box>
      }
    >
      <Box
        sx={{
          pt: 1,
          mb: 0.5,
          mx: "20px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {/* <BaseStyledSelect
          value={logLevel}
          onChange={(e) => setLogLevel(e.target.value as LogLevel)}
        >
          <MenuItem value="all">ALL</MenuItem>
          <MenuItem value="info">INFO</MenuItem>
          <MenuItem value="warning">WARNING</MenuItem>
          <MenuItem value="error">ERROR</MenuItem>
          <MenuItem value="debug">DEBUG</MenuItem>
        </BaseStyledSelect> */}
        <Menu>
          <MenuTrigger>
            <MenuButton>{logLevel}</MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList
              onCheckedValueChange={(_, { checkedItems }) =>
                setLogLevel(checkedItems[0] as LogLevel)
              }
              checkedValues={{ logState: [logLevel] }}
            >
              <MenuItemRadio name="logState" value="all">
                ALL
              </MenuItemRadio>
              <MenuItemRadio name="logState" value="info">
                INFO
              </MenuItemRadio>
              <MenuItemRadio name="logState" value="warn">
                WARN
              </MenuItemRadio>
              <MenuItemRadio name="logState" value="error">
                ERROR
              </MenuItemRadio>
              <MenuItemRadio name="logState" value="debug">
                DEBUG
              </MenuItemRadio>
            </MenuList>
          </MenuPopover>
        </Menu>
        <BaseSearchBox
          onSearch={(matcher, state) => {
            setMatch(() => matcher);
            setSearchState(state);
          }}
        />
      </Box>

      <Box
        height="calc(100% - 65px)"
        sx={{
          margin: "10px",
          mx: "20px",
          borderRadius: "8px",
          // bgcolor: isDark ? "#282a36" : "#ffffff",
          bgcolor: tokens.surface1,
        }}
      >
        {filterLogs.length > 0 ? (
          <Virtuoso
            initialTopMostItemIndex={999}
            data={filterLogs}
            itemContent={(index, item) => (
              <LogItem value={item} searchState={searchState} />
            )}
            followOutput={"smooth"}
          />
        ) : (
          <BaseEmpty />
        )}
      </Box>
    </BasePage>
  );
};

export default LogPage;
