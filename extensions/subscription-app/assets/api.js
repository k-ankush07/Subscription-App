const SECRET_KEY = "08466sdmfbf94374nkjsnfdkyry89nfksd388934jkdsf89y389bjkkr32";

export async function getData(shop) {
  try {
    const response = await fetch(
      `http://localhost:5000/plans/getAllPlans?shop=${shop}`,
      { headers: { "x-api-key": SECRET_KEY } }
    );
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}