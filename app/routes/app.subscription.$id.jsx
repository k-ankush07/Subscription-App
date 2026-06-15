import React from 'react'
import { useParams } from 'react-router'

function SubscriptionId() {
    const SubscriptionId= useParams();
  return (
    <div>app.subscription.$id</div>
  )
}

export default SubscriptionId