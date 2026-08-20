import { Badge, Card, Page } from '@shopify/polaris'
import React from 'react'

function widgets() {
  return (
    <Page
    title='Widgets'
      primaryAction={{ content: "Create widget" }}
    >
      <Card>
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
            <tbody>
              <tr>
                <td>Widgets <Badge tone='attention'>Default</Badge></td>
                <td>0</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>...</td>
              </tr>
            </tbody>

          </thead>
        </table>
      </Card>

    </Page>
  )
}

export default widgets