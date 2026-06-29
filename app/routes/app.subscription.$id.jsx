import { Page } from '@shopify/polaris'
import React from 'react'
import { useParams } from 'react-router'

function subscriptionsId() {
  const {id}= useParams()
  return (
   <>
   <Page  title={`${id}`}>

   </Page>
   </>
  )
}

export default subscriptionsId