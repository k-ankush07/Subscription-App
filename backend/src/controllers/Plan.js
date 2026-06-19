import Plan from "../model/planModel.js"

const createPlan = async (req, res) => {
  try {
    const {
      shop,
      planId,
      planName,
      widget,
      products,
      customerProductChanges,
    } = req.body;

    const plan = await Plan.create({
      shop,
      planId,
      planName,
      widget,
      products,
      customerProductChanges,
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

const getALLPlans = async (req, res) => {
  try {
    const { shop } = req.query; 

    const filter = shop ? { shop } : {};

    const plans = await Plan.find(filter);

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPlanByPlanId = async (req, res) => {
  try {
    const { planId } = req.params;


    const plan = await Plan.findOne({ planId });

    // console.log("Found plan:", plan);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    console.log("id",planId)

    const {
      shop,
      planName,
      widget,
      products,
      customerProductChanges,
    } = req.body;

    const updatedPlan = await Plan.findOneAndUpdate(
      { planId },
      {
        shop,
        planName,
        widget,
        products,
        customerProductChanges,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedPlan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Plan updated successfully",
      data: updatedPlan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// const deletePlan = async (req, res) => {
//   try {
//     const { planId } = req.params;

//     const deletedPlan = await Plan.findOneAndDelete({ planId });

//     if (!deletedPlan) {
//       return res.status(404).json({
//         success: false,
//         message: "Plan not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Plan deleted successfully",
//       data: deletedPlan,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };





export {  createPlan,getALLPlans  ,getPlanByPlanId,updatePlan};