import { GlobalLayout } from "@/features/layouts/components/global/GlobalLayout";
import Head from "next/head";
import { useTranslation } from "next-i18next";
import {
  Hero,
  MainLayout,
  HomeGutter,
  Icon,
  IconType,
} from "@gouvfr-lasuite/ui-kit";
import { login, useAuth } from "@/features/auth/Auth";
import { gotoLastVisitedItem } from "@/features/explorer/utils/utils";
import { useEffect } from "react";
import banner from "@/assets/home/banner.png";
import { HeaderRight } from "@/features/layouts/components/header/Header";
import {
  addToast,
  Toaster,
  ToasterItem,
} from "@/features/ui/components/toaster/Toaster";
import { Button } from "@openfun/cunningham-react";
import { LeftPanelMobile } from "@/features/layouts/components/left-panel/LeftPanelMobile";
import { SESSION_STORAGE_REDIRECT_AFTER_LOGIN_URL } from "@/features/api/fetchApi";

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Redirect to the attempted url if it exists, otherwise redirect to the last visited item.
  useEffect(() => {
    if (user) {
      const attemptedUrl = sessionStorage.getItem(
        SESSION_STORAGE_REDIRECT_AFTER_LOGIN_URL
      );
      if (attemptedUrl) {
        sessionStorage.removeItem(SESSION_STORAGE_REDIRECT_AFTER_LOGIN_URL);
        window.location.href = attemptedUrl;
      } else {
        gotoLastVisitedItem();
      }
    }
  }, [user]);

  useEffect(() => {
    const failure = new URLSearchParams(window.location.search).get(
      "auth_error"
    );
    if (failure === "alpha") {
      addToast(
        <ToasterItem type="error">
          <span className="material-icons">science</span>
          <span>{t("authentication.error.alpha")}</span>
        </ToasterItem>
      );
    }
  }, []);

  if (user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Local Drive</title>
        <meta name="description" content={t("app_description")} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" />
      </Head>

      <HomeGutter>
        <Hero
          logo={<div className="drive__logo-icon" />}
          banner={banner.src}
          title={t("home.title")}
          subtitle={t("home.subtitle")}
          mainButton={
            <Button
              color="primary"
              onClick={() => login()}
              icon={<Icon name="arrow_forward" />}
              fullWidth
            >
              {t("home.main_button")}
            </Button>
          }
        />
      </HomeGutter>
    </>
  );
}

HomePage.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <div className="drive__home drive__home--feedback">
      <GlobalLayout>
        <MainLayout
          enableResize
          hideLeftPanelOnDesktop={true}
          leftPanelContent={<LeftPanelMobile />}
          icon={
            <div className="drive__header__left">
             <h1>Local Drive</h1>
            </div>
          }
          rightHeaderContent={<HeaderRight />}
        >
          {page}
          <Toaster />
        </MainLayout>
      </GlobalLayout>
    </div>
  );
};
