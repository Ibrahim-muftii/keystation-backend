import { DataTypes } from "sequelize";
import { sequelize } from "../configs/database.config";
import User from "./user";
import { twilio } from "@elevenlabs/elevenlabs-js/api/resources/conversationalAi";


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