import Plan from "../model/planModel.js"

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


// const getALLPlans = async (req, res) => {
//   try {
//     const plans = await Plan.find();

//     res.status(200).json({
//       success: true,
//       count: plans.length,
//       data: plans,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };






export {  createPlan };