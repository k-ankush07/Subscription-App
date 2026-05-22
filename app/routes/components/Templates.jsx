import React from 'react'
import { Grid,Page, TextField, FormLayout, Card, BlockStack,Text ,MediaCard} from '@shopify/polaris';
import { useNavigate } from 'react-router';
import Products from "../components/Products"



function Templates() {
  const navigate= useNavigate()
   const handleClick = () => {
    navigate('/app/plans');
  };

  return (
     <Page
  backAction={{
    content: 'Products',
    onAction: handleClick,
  }}
  title="Plan name"
  primaryAction={{ content: 'Publish' }}
  secondaryActions={[
    {
      content: 'Save as draft',
      accessibilityLabel: 'Save as draft',
    },
  ]}
>

  <Grid>
    {/* Left Column */}
    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 8 }}>
      <BlockStack gap="500">
      <MediaCard
             title="New to Kaching Subscriptions?"
             primaryAction={{
               content: 'Optional tutorials',
               onAction: () => { },
             }}
             description="Discover how Shopify can power up your entrepreneurial journey."
           >
             <img
               alt=""
               width="100%"
               height="100%"
               style={{
                 objectFit: 'cover',
                 objectPosition: 'center',
               }}
               src="https://subscriptions-assets.kachingappz.app/kaching-tutorial.jpg"
             />
           </MediaCard>

        <Card>
          <FormLayout>
            <TextField
              label="Title"
              onChange={() => {}}
              autoComplete="off"
            />

            <TextField
              label="Internal description"
              onChange={() => {}}
              autoComplete="off"
            />
          </FormLayout>
         <Products />
          
        </Card>
      </BlockStack>
    </Grid.Cell>

    {/* Right Column */}
    <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4 }}>
      <Card>
        <BlockStack gap="300">
          <div>
            <Text variant="headingMd" as="h2">
            Summary
          </Text>

          <ul style={{ paddingLeft: '18px', margin: 0 }}>
            <li>1 delivery</li>
          </ul>
          </div>
           <div>
            <Text variant="headingMd" as="h2">
            Option 1
          </Text>

          <ul style={{ paddingLeft: '18px', margin: 0 }}>
            <li>Delivery: every 2 months</li>
            <li>Save 10% off on the initial order and all future orders</li>
          </ul>
          </div>
        </BlockStack>
      </Card>
    </Grid.Cell>
  </Grid>
</Page>
  )
}

export default Templates

