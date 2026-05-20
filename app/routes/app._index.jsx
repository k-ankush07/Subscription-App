import React, { useEffect, useState } from 'react';
import { Page, TextField, Card, BlockStack, Frame } from '@shopify/polaris';

function Index() {
  
  const [savedData, setSavedData] = useState({ title: '', description: '', price: '' });
  const [formData, setFormData] = useState(savedData);
  const [loading, setLoading] = useState(false);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(savedData);

  
  useEffect(() => {
    const saveBar = document.getElementById('my-save-bar');
    if (!saveBar) return;
    isDirty ? saveBar.show() : saveBar.hide();
  }, [isDirty]);

 
  useEffect(() => {
    const saveBtn = document.querySelector('#abc');
    if (!saveBtn) return;
    if (loading) {
      saveBtn.setAttribute('loading', '');
      saveBtn.setAttribute('disabled', '');
    } else {
      saveBtn.removeAttribute('loading');
      saveBtn.removeAttribute('disabled');
    }
  }, [loading]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true); 

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setSavedData(formData);
    localStorage.setItem('formData', JSON.stringify(formData));

    setLoading(false);
    document.getElementById('my-save-bar')?.hide();
  };

  const handleDiscard = () => {
    setFormData(savedData);
    document.getElementById('my-save-bar')?.hide();
  };

  useEffect(() => {
    const data = localStorage.getItem('formData');
    if (data) {
      const parsedData = JSON.parse(data);
      setSavedData(parsedData);
      setFormData(parsedData);
    }
  }, []);

  return (
    <Frame>
      <Page title="Subscription-App" fullWidth>

        <ui-save-bar id="my-save-bar">
          <button variant="primary" id='abc' onClick={handleSave}>Save</button>
          <button onClick={handleDiscard}>Discard</button>
        </ui-save-bar>

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