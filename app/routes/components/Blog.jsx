import React from 'react'
import {Page,Badge,SkeletonPage,
  Layout,
 
  SkeletonBodyText,
  
  SkeletonDisplayText,} from '@shopify/polaris';
import { useNavigate } from 'react-router';
function Blog() {
    const navigate = useNavigate();
  return (
    <Page
      backAction={{ content: "Home",
    onAction: () => navigate("/app/home"),}}
      title="3/4 inch Leather pet collar"
      titleMetadata={<Badge tone="warning">waring</Badge>}
      subtitle="Perfect for any pet"
      compactTitle
      primaryAction={{content: 'Save', disabled: true}}
      secondaryActions={[
        {
          content: 'Duplicate',
          accessibilityLabel: 'Secondary action label',
          onAction: () => alert('Duplicate action'),
        },
        {
          content: 'View on your store',
          onAction: () => alert('View on your store action'),
        },
      ]}
      actionGroups={[
        {
          title: 'Promote',
          actions: [
            {
              content: 'Share on Facebook',
              accessibilityLabel: 'Individual action label',
              onAction: () => alert('Share on Facebook action'),
            },
          ],
        },
      ]}
      pagination={{
        hasPrevious: true,
        hasNext: true,
      }}
    >
          <SkeletonPage primaryAction>
      <Layout>
       
            <SkeletonBodyText />
        
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText />
           
        
              <SkeletonDisplayText size="small" />
              <SkeletonBodyText />
            
       
        <Layout.Section variant="oneThird">
         
              
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={2} />
              
              <SkeletonBodyText lines={1} />
           
          
          
                <SkeletonDisplayText size="small" />
                <SkeletonBodyText lines={2} />
             
           
              <SkeletonBodyText lines={2} />
            
        </Layout.Section>
      </Layout>
    </SkeletonPage>
      
    </Page>
  )
}

export default Blog
