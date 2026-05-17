import React from 'react'
import {MediaCard,Page} from '@shopify/polaris';
function Templates() {
  return (
    <Page>
     <MediaCard
      title="New to Kaching Subscriptions?"
      primaryAction={{
        content: 'Optional tutorials',
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
        src="https://subscriptions-assets.kachingappz.app/kaching-tutorial.jpg"
      />
    </MediaCard>
    </Page>
  )
}

export default Templates
