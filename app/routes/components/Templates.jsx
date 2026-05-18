import React, { useCallback, useState } from 'react'
import { MediaCard, Page, TextField, FormLayout, Card ,BlockStack} from '@shopify/polaris';
function Templates() {
  const [value, setValue] = useState('');

  const handleChange = useCallback(
    (newValue) => setValue(newValue),
    [],
  );
  return (
    <Page>
<BlockStack gap="500">
      <MediaCard
        title="New to Kaching Subscriptions?"
        primaryAction={{
          content: 'Optional tutorials',
          onAction: () => { },
        }}
        description="Discover how Shopify can power up your entrepreneurial journey."
        popoverActions={[{ content: 'Dismiss', onAction: () => { } }]}
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
            <TextField label="Title" onChange={() => { }} autoComplete="off" />

            <TextField label="Internal description" onChange={() => { }} autoComplete="off" />

          </FormLayout>
        </Card>
      </BlockStack>

    </Page>
  )
}

export default Templates

