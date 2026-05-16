import React, { useState } from 'react'
import { useNavigate } from 'react-router';

function About() {
     const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }
 const navigate= useNavigate()

  function Form(e) {
    e.preventDefault();

     console.log(formData);

    localStorage.setItem(
      "user",
      JSON.stringify(formData)
    );
    navigate("/app/blog")
  }
  return (
   <>
      <h1>About Us page</h1>

      <form onSubmit={Form}>

        <div>
          <label>Name</label>

          <input
            type="text"
            name='name'
            placeholder="Enter Name here"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <label>Email</label>

          <input
            type="email"
            placeholder="Enter email here"
            name='email'
            value={formData.email}
          onChange={handleChange}
          />
        </div>

        <button type="submit" style={{ cursor:"pointer"}}>
          Submit Form
        </button>

      </form>
   </>
  )
}

export default About
