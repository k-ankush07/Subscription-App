import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  AppProvider as ShopifyAppProvider,
} from "@shopify/shopify-app-react-router/react";

import {
  AppProvider as PolarisAppProvider,
} from "@shopify/polaris";

import "@shopify/polaris/build/esm/styles.css";
import enTranslations from "@shopify/polaris/locales/en.json";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};

function PolarisProvider({ children }) {
  return (
    <PolarisAppProvider i18n={enTranslations}>
      {children}
    </PolarisAppProvider>
  );
}

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <PolarisProvider>
      <ShopifyAppProvider embedded apiKey={apiKey}>
        <s-app-nav>
          <s-link href="/app/plans">Plan Page</s-link>
          <s-link href="/app/subscription">Subscription</s-link>
       
        </s-app-nav>

        <Outlet />
      </ShopifyAppProvider>
    </PolarisProvider>
  );
}


export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};