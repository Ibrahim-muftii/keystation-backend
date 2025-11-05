import { DataTypes } from "sequelize";
import { sequelize } from "../configs/database.config";



const TwilioNumbers = sequelize.define("TwilioNumbers", {
    userId:{
        type:DataTypes.INTEGER,
        allowNull:false,
        references: {
            model:'users',
            key:'id'
        },
        onDelete: "SET NULL"
    },
    phoneNumber: {
        type:DataTypes.STRING,
        allowNull:false
    },
    priority:{
        type:DataTypes.INTEGER
    }

},{timestamps:true, tableName:"twilioNumbers"});

export default TwilioNumbers;