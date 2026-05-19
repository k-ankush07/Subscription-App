import React from 'react'
import {Frame, ContextualSaveBar, Page} from '@shopify/polaris';
function Index() {
  return (
   <Page fullWidth>
      <div style={{height: '250px'}}>
      <Frame
        logo={{
          width: 86,
          contextualSaveBarSource:
            'https://cdn.shopify.com/s/files/1/2376/3301/files/Shopify_Secondary_Inverted.png',
        }}
      >
        <ContextualSaveBar
          message="Unsaved changes"
          saveAction={{
            onAction: () => console.log('add form submit logic'),
            loading: false,
            disabled: false,
          }}
          discardAction={{
            onAction: () => console.log('add clear form logic'),
          }}
        />
      </Frame>
    </div>
    </Page>
  )
}

export default Index
