import { Button, Card, Page, TextField } from '@shopify/polaris'
import React from 'react'

function Customerportal() {
  return (
   <Page
   title="Customer portal"
   >
    <Card>
        <h2>Self-service</h2>
        <p>To let customers manage subscriptions, enable it in <a href="#"> checkout settings.</a></p>

        <h2>Customer portal URL</h2>
        <p>Add the customer portal URL anywhere youd like to give customers an entry point to the subscriptions management page.</p>
        <TextField disabled autoComplete="off" 
        value="https://shopify.com/71231537372/account/pages/7c4a25d5-0da8-4259-bf5f-40ed6112e4d6"
        >
        </TextField>
    </Card>
   </Page>
  )
}

export default Customerportal