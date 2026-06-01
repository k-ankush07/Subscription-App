
import Plan from "../model/planModel.js"
const plans =((req, res)=>
{
    res.send("hello")
})



const createPlan = async (req, res) => {

  console.log(req.body)
  try {
    const {
      shop,
      title,
      description,
      selectedProducts,
      productChanges,
      options,
    } = req.body;

    const plan = await Plan.create({
      shop,
      title,
      description,
      selectedProducts,
      productChanges,
      options,
    });

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





export { plans, createPlan };