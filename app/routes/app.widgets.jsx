import { Badge, Card, Page, Button, Icon } from "@shopify/polaris";
import { PlusCircleIcon } from "@shopify/polaris-icons";
import React from 'react'

function widgets() {
  return (
    <Page
    
      primaryAction={{ content: "Create widget" ,icon: PlusCircleIcon,}}
    >
      <Card
      title='Widgets'
      >
        <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th> Widget title </th>
              <th> Plans assigned </th>
              <th> Highlights </th>
              <th> Sticky ATC </th>
              <th> Card badge </th>
              <th> Actions </th>
            </tr>
          </thead>
          <tbody >
              <tr style={{textAlign:"center"}}>
                <td>Widgets <Badge tone='attention'>Default</Badge></td>
                <td>0</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>...</td>
              </tr>
            </tbody>
        </table>
      </Card>

    </Page>
  )
}

export default widgets