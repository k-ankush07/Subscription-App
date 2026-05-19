import React from 'react'
import {Page, Grid, LegacyCard} from '@shopify/polaris';
import {MediaCard} from '@shopify/polaris';
import {Thumbnail} from '@shopify/polaris';
function Index() {
  return (
   <Page fullWidth>
         <MediaCard
      title="Getting Started"
      primaryAction={{
        content: 'Learn about getting started',
        onAction: () => {},
      }}
      description="Discover how Shopify can power up your entrepreneurial journey."
      popoverActions={[{content: 'Dismiss', onAction: () => {}}]}
    >
      <img
        alt=""
        width="100%"
        height="100%"
        style={{
          objectFit: 'cover',
          objectPosition: 'center',
        }}
        src="https://burst.shopifycdn.com/photos/business-woman-smiling-in-office.jpg?width=1850"
      />
    </MediaCard>
    </Page>
  )
}

export default Index
