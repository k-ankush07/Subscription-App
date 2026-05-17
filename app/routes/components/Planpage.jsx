import React from 'react'
import {LegacyCard, EmptyState} from '@shopify/polaris';
import { useNavigate } from 'react-router';
function Planpage() {
    const navigate= useNavigate()

    const handleClick= ()=>
    {
        navigate("/app/create")
    }
  return (
    <>
    <LegacyCard sectioned>
      <EmptyState
        heading="Get more repeat business"
        action={{content: 'Create Plain',
            onAction: handleClick
        }}
        // secondaryAction={{
        //   content: 'Learn more',
        //   url: 'https://help.shopify.com',
        // }}
        image="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png"
      >
        <p>Allow customers to purchase products or services on a recurring basis.</p>
      </EmptyState>
    </LegacyCard>
   
    </>
  )
}

export default Planpage
