import Plan from "../model/planModel.js"

const createPlan = async (req, res) => {
  try {
    const {
      shop,
      planId,
      title,
      description,
       shopifyGroupId,
      selectedProducts,
      productChanges,
      options,
    } = req.body;

    const plan = await Plan.create({
      shop,
      planId,
      title,
       shopifyGroupId,
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


const getALLPlans = async (req, res) => {
  try {
    const plans = await Plan.find();

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

    const {
      shop,
      title,
      description,
      selectedProducts,
      productChanges,
      options,
    } = req.body;

    const updatedPlan = await Plan.findOneAndUpdate(
      { planId },
      {
        shop,
        title,
        description,
        selectedProducts,
        productChanges,
        options,
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


const deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;

    const deletedPlan = await Plan.findOneAndDelete({ planId });

    if (!deletedPlan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Plan deleted successfully",
      data: deletedPlan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getPlanByShopifyGroupId = async (req, res) => {
  try {
    const { shopifyGroupId } = req.params;
    
    // URL se sirf number aata hai jaise 1608712378
    // DB mein full GID hai: gid://shopify/SellingPlanGroup/1608712378
    const fullId = `gid://shopify/SellingPlanGroup/${shopifyGroupId}`;
    
    const plan = await Plan.findOne({ shopifyGroupId: fullId });
    
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }
    
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export {  createPlan ,getALLPlans,getPlanByPlanId,updatePlan,deletePlan,getPlanByShopifyGroupId };