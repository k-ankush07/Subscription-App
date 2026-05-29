export function useAuthenticatedFetch() {

  return async (url, options = {}) => {

    const token = await window.shopify?.idToken?.();

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


// export function useAuthenticatedFetch() {
//   return async (url, options = {}) => {
//     const token = await window.shopify?.idToken?.();

//     const shop = new URLSearchParams(window.location.search).get("shop");

//     const finalUrl = shop
//       ? `${url}${url.includes("?") ? "&" : "?"}shop=${shop}`
//       : url;

//     return fetch(finalUrl, {
//       ...options,
//       headers: {
//         ...(options.headers || {}),
//         ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       },
//     });
//   };
// }