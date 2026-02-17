import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactElement,
  type ReactNode,
  Component,
  type ErrorInfo,
} from "react";
import type { NextPage } from "next";
import type { AppProps } from "next/app";
import { CunninghamProvider } from "@gouvfr-lasuite/ui-kit";
import {
  MutationCache,
  Query,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import "../styles/globals.scss";
import "../features/i18n/initI18n";
import {
  addToast,
  ToasterItem,
} from "@/features/ui/components/toaster/Toaster";
import { APIError, errorToString } from "@/features/api/APIError";
import Head from "next/head";
import { useTranslation } from "react-i18next";
import { AnalyticsProvider } from "@/features/analytics/AnalyticsProvider";
import { capitalizeRegion } from "@/features/i18n/utils";
import { ConfigProvider } from "@/features/config/ConfigProvider";
import {
  removeQuotes,
  useCunninghamTheme,
} from "@/features/ui/cunningham/useCunninghamTheme";
import { ResponsiveDivs } from "@/features/ui/components/responsive/ResponsiveDivs";
import { useRouter } from "next/router";
import { useMemo } from "react";

export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};
const onError = (error: Error, query: unknown) => {
  if ((query as Query).meta?.noGlobalError) {
    return;
  }

  if (error instanceof APIError && (error.code === 401 || error.code === 403)) {
    return;
  }

  addToast(
    <ToasterItem type="error">
      <span>{errorToString(error)}</span>
    </ToasterItem>
  );
};

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      onError(error, mutation);
    },
  }),
  queryCache: new QueryCache({
    onError: (error, query) => onError(error, query),
  }),
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export interface AppContextType {
  theme: string;
  setTheme: (theme: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
};

/**
 * Check if an error originates from a Chrome extension
 */
const isChromeExtensionError = (error: Error | string | unknown): boolean => {
  if (!error) return false;
  
  const errorString = typeof error === "string" ? error : error instanceof Error ? error.toString() : String(error);
  const stack = error instanceof Error ? error.stack || "" : "";
  const message = error instanceof Error ? error.message : errorString;
  
  // Check if error is from chrome-extension:// or moz-extension:// URLs
  const isExtensionUrl = 
    errorString.includes("chrome-extension://") ||
    stack.includes("chrome-extension://") ||
    errorString.includes("moz-extension://") ||
    stack.includes("moz-extension://");
  
  // Check for specific MetaMask/Web3 wallet error patterns
  const isWalletError = 
    message.includes("Cannot destructure property") && 
    (message.includes("e.data") || message.includes("data.target"));
  
  return isExtensionUrl || isWalletError;
};

/**
 * Error Boundary component to catch React errors from extensions
 */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // If error is from a Chrome extension, don't show error boundary
    if (isChromeExtensionError(error)) {
      return null;
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Ignore errors from Chrome extensions
    if (isChromeExtensionError(error)) {
      console.warn("Ignored error from browser extension:", error.message);
      return;
    }
    
    // Log other errors for debugging
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can customize this error UI
      return (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <p>Please refresh the page or contact support if the problem persists.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function MyApp({
  Component,
  pageProps,
  router,
}: AppPropsWithLayout) {
  const [theme, setTheme] = useState<string>("default");

  return (
    <AppContext.Provider value={{ theme, setTheme }}>
      <MyAppInner Component={Component} pageProps={pageProps} router={router} />
    </AppContext.Provider>
  );
}

const MyAppInner = ({ Component, pageProps }: AppPropsWithLayout) => {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page);
  const { t, i18n } = useTranslation();
  const { theme } = useAppContext();
  const themeTokens = useCunninghamTheme();

  const router = useRouter();
  const isSdk = useMemo(
    () => router.pathname.startsWith("/sdk"),
    [router.pathname]
  );

  // Set up global error handlers to filter out Chrome extension errors
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (isChromeExtensionError(error)) {
        event.preventDefault();
        console.warn("Ignored unhandled rejection from browser extension:", error);
        return;
      }
    };

    // Handle general errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event.message;
      if (isChromeExtensionError(error)) {
        event.preventDefault();
        console.warn("Ignored error from browser extension:", error);
        return;
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <>
      <Head>
        <title>{t("app_title")}</title>
        <link
          rel="icon"
          href={removeQuotes(themeTokens.components.favicon.src)}
          type="image/png"
        />
      </Head>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <CunninghamProvider
            currentLocale={capitalizeRegion(i18n.language)}
            theme={theme}
          >
            <ConfigProvider>
              <AnalyticsProvider>
                {getLayout(<Component {...pageProps} />)}
                <ResponsiveDivs />
              </AnalyticsProvider>
            </ConfigProvider>
          </CunninghamProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </>
  );
};
