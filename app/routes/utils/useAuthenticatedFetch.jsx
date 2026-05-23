
import { getSessionToken } from "@shopify/app-bridge-utils";
export function useAuthenticatedFetch() {

  return async (url, options = {}) => {

    // const token = await window.shopify?.idToken?.();
     const token = await getSessionToken(window.app); 

    return fetch(url, {
      ...options,

      headers: {
        ...(options.headers || {}),

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    });
  };
}