import React, { useEffect, useState, useRef } from 'react';
import { Page, TextField, Card, BlockStack, Frame, Spinner } from '@shopify/polaris';
import { SaveBar, useAppBridge } from '@shopify/app-bridge-react';

function Index() {
  const shopify = useAppBridge();
  const saveButtonRef = useRef(null);

  const [savedData, setSavedData] = useState({ title: '', description: '', price: '' });
  const [formData, setFormData] = useState(savedData);
  const [loading, setLoading] = useState(false);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(savedData);

  useEffect(() => {
    if (isDirty) {
      shopify.saveBar.show('mo-save-bar');
    } else {
      shopify.saveBar.hide('mo-save-bar');
    }
  }, [isDirty]);

  //  Toggle loading attribute on the Save button directly
  useEffect(() => {
    if (saveButtonRef.current) {
      if (loading) {
        saveButtonRef.current.setAttribute('loading', ''); // triggers built-in spinner
        saveButtonRef.current.setAttribute('disabled', '');
      } else {
        saveButtonRef.current.removeAttribute('loading');
        saveButtonRef.current.removeAttribute('disabled');
      }
    }
  }, [loading]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setSavedData(formData);
    localStorage.setItem("formData", JSON.stringify(formData));

    setLoading(false);
    shopify.saveBar.hide('mo-save-bar');
  };

  const handleDiscard = () => {
    setFormData(savedData);
    shopify.saveBar.hide('mo-save-bar');
  };

  useEffect(() => {
    const data = localStorage.getItem("formData");
    if (data) {
      const parsedData = JSON.parse(data);
      setSavedData(parsedData);
      setFormData(parsedData);
    }
  }, []);

  return (
    <Frame>
      <Page title="Subscription-App" fullWidth>

        {loading && <Spinner accessibilityLabel="Small spinner example" size="small" />}

        <SaveBar id="mo-save-bar">
          {/*  ref + loading attribute triggers SaveBar's native spinner */}
          <button
            ref={saveButtonRef}
            variant="primary"
            onClick={handleSave}
          >
            Save
          </button>
          <button onClick={handleDiscard} disabled={loading}>
            Discard
          </button>
        </SaveBar>

        <Card roundedAbove="sm">
          <BlockStack gap="400">

            <TextField
              label="Product Title"
              value={formData.title}
              onChange={(value) => handleChange('title', value)}
              autoComplete="off"
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(value) => handleChange('description', value)}
              multiline={4}
              autoComplete="off"
            />

            <TextField
              label="Price"
              value={formData.price}
              onChange={(value) => handleChange('price', value)}
              autoComplete="off"
            />

          </BlockStack>
        </Card>

      </Page>
    </Frame>
  );
}

export default Index;