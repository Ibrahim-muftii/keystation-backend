import { DataTypes, Sequelize } from "sequelize";
import { sequelize } from "../configs/database.config";
import ApiKeys from "./apikey";

const User = sequelize.define("Users",{
    firstName:{
        type:DataTypes.STRING,
        allowNull:false
    },
    lastName:{
        type:DataTypes.STRING,
        allowNull:false
    },
    email:{
        type:DataTypes.STRING,
        allowNull:false,
        unique:true
    },
    password:{
        type:DataTypes.STRING,
        allowNull:false,
    }  
}, {
    timestamps:true,
    tableName:"users"
})

export default User;