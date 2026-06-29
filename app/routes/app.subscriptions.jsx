import { Page,Card } from '@shopify/polaris'
import { authenticate } from '../shopify.server'
import React from 'react'
import { useLoaderData } from 'react-router'

export  async function  loader ({request})
{ const {admin}= await authenticate.admin(request)

const res= await admin.graphql(`
    query {
  subscriptionContracts(first: 50) {
    edges {
      node {
        id
        status
        createdAt
        updatedAt
        nextBillingDate
        currencyCode

        customer {
          id
          firstName
          lastName
          email
        }


        deliveryPolicy {
          interval
          intervalCount
        }

        deliveryPrice {
          amount
          currencyCode
        }

        lines(first: 10) {
          edges {
            node {
              id
              title
              quantity
              sellingPlanName
              sellingPlanId

              currentPrice {
                amount
                currencyCode
              }

              pricingPolicy {
                cycleDiscounts {
                  adjustmentType
                  adjustmentValue {
                    ... on SellingPlanPricingPolicyPercentageValue {
                      percentage
                    }
                    ... on MoneyV2 {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }

        orders(first: 50) {
          edges {
            node {
              id
              name
              createdAt
            }
          }
        }

        originOrder {
          id
          name
        }
      }
    }
  }
}`

)
const data = await res.json();

  return {
    contracts: data.data.subscriptionContracts.edges.map((e) => e.node),
  };
}

function Subscriptions() {
    const {contracts}= useLoaderData();
    console.log("subscription data ",contracts)

  return (
    <>
    <Page title="Subscriptions">
        <Card>
           <div>
            <table border="1">
          <thead>
              <tr>
                <th>ContractId</th>
            <th>Status</th>
            <th>Customer Email</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Next Order Date</th>
            <th>Product</th>
            <th>Price</th>
            <th>Delivery Frequency</th>
            </tr>
          </thead>
           <tbody>
  {contracts.map((item) => {
    const line = item.lines?.edges?.[0]?.node;

    return (
      <tr key={item.id}>
        <td>{item.id.split("/").pop()}</td>
        <td>{item.status}</td>
        <td>
            {item.customer?.firstName}{item.customer?.lastName} <br/>
            {item.customer?.email}</td>
        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
        <td>{new Date(item.updatedAt).toLocaleDateString()}</td>
        <td>{new Date(item.nextBillingDate).toLocaleDateString()}</td>

        <td>{line?.title}</td>

        <td>
         
        </td>

        <td>
          Every {item.deliveryPolicy?.intervalCount}{" "}
          {item.deliveryPolicy?.interval}
        </td>
      </tr>
    );
  })}
</tbody>
           </table>
           </div>

        </Card>

    </Page>
    </>
  )
}

export default Subscriptions