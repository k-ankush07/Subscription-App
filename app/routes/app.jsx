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
          <s-link href="/app/home">Home Page</s-link>
          <s-link href="/app/about">About Page</s-link>
          <s-link href="/app/blog">Blog Page</s-link>
          <s-link href="/app/products">product Page</s-link>
          <s-link href="/app/plans">Plan Page</s-link>
   
        </s-app-nav>

        <Outlet />
      </ShopifyAppProvider>
    </PolarisProvider>
  );
}

// Shopify needs React Router to catch some thrown responses
// so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};