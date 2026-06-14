import { useTranslation } from "react-i18next";
import { Box } from "@mui/material";
import { BasePage } from "@/components/base";
import {
  TrafficStatsCard,
  ClashInfoCard,
  ClashModeCard,
  HomeProfileCard,
  ProxyTunCard,
  IpInfoCard,
  SystemInfoCard,
} from "@/components/home/home-cards";

const HomePage = () => {
  const { t } = useTranslation();

  return (
    <BasePage title={t("Label-Home")}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 1.5,
          p: 1,
          alignItems: "stretch",
        }}
      >
        <HomeProfileCard />
        <ClashModeCard />
        <TrafficStatsCard />
        <ProxyTunCard />
        <ClashInfoCard />
        <SystemInfoCard />
        <IpInfoCard />
      </Box>
    </BasePage>
  );
};

export default HomePage;
