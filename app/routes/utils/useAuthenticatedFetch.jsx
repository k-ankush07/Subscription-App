

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