import React, { useEffect, useState } from 'react';

function PlanId() {
  const [planData, setPlanData] = useState(null);

  useEffect(() => {
    const data = localStorage.getItem("planPayload");

    console.log("RAW:", data);

    if (data) {
      const parsedData = JSON.parse(data);

      console.log("PARSED:", parsedData);

      setPlanData(parsedData);
    }
  }, []);

  return (
    <div>
      <h1>Plan Details</h1>

      {planData && (
        <>
          <p>{planData.title}</p>
          <p>{planData.description}</p>
          <p>{planData.id}</p>
        </>
      )}
    </div>
  );
}

export default PlanId;