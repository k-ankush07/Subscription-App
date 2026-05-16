import React from 'react'
import {Page} from '@shopify/polaris';
import { Link } from 'react-router';
function TopHeading() {
    const products= [
        {
            id: 1,
            name: "First Products",
            description: "this isour first product",
            image:"https://help.rangeme.com/hc/article_attachments/360006928633/what_makes_a_good_product_image.jpg",
        },
        {
            id: 2,
            name: "First Products",
            description: "this isour first product",
            image:"https://help.rangeme.com/hc/article_attachments/360006928633/what_makes_a_good_product_image.jpg",
        },
        {
            id: 3,
            name: "First Products",
            description: "this isour first product",
            image:"https://help.rangeme.com/hc/article_attachments/360006928633/what_makes_a_good_product_image.jpg",
        },
        {
            id: 4,
            name: "First Products",
            description: "this isour first product",
            image:"https://help.rangeme.com/hc/article_attachments/360006928633/what_makes_a_good_product_image.jpg",
        },
    ]
    
  return (
   <>
   <p>
    Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
   </p>
   {products.map((item,index)=>
{
     return (
    <div key={item.id} style={{
        display: "flex",
        justifyContent: "start",
        alignItems: "center",
       gap: "10px",
      marginBottom: "20px",
    }}>

        <h1>{item.name} {index+1}</h1>
        <p>{item.description}</p>
        <img src={item.image} width="200" style={{
            borderRadius: "20px"
        }} />
    </div>
)})}
<Link to="/app/about"><button style={{
    cursor:"pointer"
}}> Go To Next Page</button></Link>

   
   
   </>
  )
}

export default TopHeading
