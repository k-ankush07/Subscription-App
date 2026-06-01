import mongoose, { Mongoose } from "mongoose";




const planSchema= new mongoose.Schema({
  shop:{
    type:String,
    required:true,
  },
  planId:{
    type:String,
    required:true
  },
  title:{
    type:String,
    required: true
  },
  description:{
    type:String,
  },
  selectedProducts:{ 
    type:mongoose.Schema.Types.Mixed,
  },
  productChanges:{
      type:mongoose.Schema.Types.Mixed,
  },
  options:{
    type:mongoose.Schema.Types.Mixed,
  }
},{
   timestamps: true,
})

export default mongoose.model("Plan", planSchema);