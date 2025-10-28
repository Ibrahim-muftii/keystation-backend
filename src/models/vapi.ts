import { DataTypes } from "sequelize";
import { sequelize } from "../configs/database.config";


const Vapi = sequelize.define("vapi",{
    vapiAssistantId:{
        type:DataTypes.STRING,
        allowNull:false
    },
    vapiAssistantName:{
        type:DataTypes.STRING,
        allowNull:false,
    },
    phoneNumber:{
        type:DataTypes.STRING,
        allowNull:true
    },
    phoneNumberId:{
        type:DataTypes.STRING,
        allowNull:true
    },
    userId:{
        type:DataTypes.INTEGER,
        allowNull:false,
        references: {
            model:"users",
            key:'id',
        },
        onDelete: "SET NULL"
    }
},{
    timestamps:true,
    tableName:'vapi'
})

export default Vapi
