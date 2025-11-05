import { DataTypes } from "sequelize";
import { sequelize } from "../configs/database.config";


const ApiKeys = sequelize.define("apikeys", {
    vapiKey: {
        type:DataTypes.STRING,
        allowNull:true
    },
    vapiAssistantId:{
        type:DataTypes.STRING,
        allowNull:true
    },
    twilioAccessKey:{
        type:DataTypes.STRING,
        allowNull:true,
    },
    twilioAccountId:{
        type:DataTypes.STRING,
        allowNull:true
    },
    elevenLabKey: {
        type:DataTypes.STRING,
        allowNull:true
    },
    magentoUsername: {
        type:DataTypes.STRING,
        allowNull:true
    },
    magentoPassword:{
        type:DataTypes.STRING,
        allowNull:true
    },
    userId:{
        type:DataTypes.INTEGER,
        allowNull:false,
        references: {
            model:'users',
            key:'id'
        },
        onDelete: "SET NULL"
    }
},{
    timestamps:true,
    tableName:'apiKeys'
})



export default ApiKeys;