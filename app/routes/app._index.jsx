import React, {useState} from 'react';

import {
  Page,
  Frame,
  TextField,
  Card,
  BlockStack,
  Button,
  InlineStack,
} from '@shopify/polaris';

function Index() {

  // SAVED DATA
  const [savedData, setSavedData] = useState({
    title: 'My Product',
    description: 'Nice product',
    price: '100',
  });

  // FORM DATA
  const [formData, setFormData] = useState(savedData);

  // HANDLE CHANGE
  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  // SAVE
  const handleSave = (e) => {
    e.preventDefault();

    setSavedData(formData);

    console.log('Saved:', formData);
  };

  // DISCARD
  const handleDiscard = () => {
    setFormData(savedData);
  };

  return (
    <Frame>

      <Page
        title="Subscription-App"
        fullWidth
      >

        <form data-save-bar onSubmit={handleSave}>

          <Card roundedAbove="sm">

            <BlockStack gap="400">

              <TextField
                label="Product Title"
                value={formData.title}
                onChange={(value) =>
                  handleChange('title', value)
                }
                autoComplete="off"
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(value) =>
                  handleChange('description', value)
                }
                multiline={4}
                autoComplete="off"
              />

              <TextField
                label="Price"
                value={formData.price}
                onChange={(value) =>
                  handleChange('price', value)
                }
                autoComplete="off"
              />

              {/* Hidden buttons for save bar */}
              <InlineStack gap="200">
                <button type="submit" hidden>
                  Save
                </button>

                <button
                  type="reset"
                  hidden
                  onClick={handleDiscard}
                >
                  Discard
                </button>
              </InlineStack>

            </BlockStack>

          </Card>

        </form>

      </Page>

    </Frame>
  );
}

export default Index;