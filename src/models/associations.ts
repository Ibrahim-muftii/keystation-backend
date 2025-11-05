import ApiKeys from "./apikey";
import TwilioNumbers from "./twilioNumbers";
import User from "./user";
import Vapi from "./vapi";

export const runAssocations = () => {
    try {

        /// user associations ///
        User.hasOne(ApiKeys,{foreignKey:"userId" , as:'apiKeys'});
        User.hasOne(Vapi, {foreignKey:"userId", as:'vapi'});
        User.hasMany(TwilioNumbers, {foreignKey:"userId", as:"twilioNumbers"});

        /// apiKeys associations ///
        ApiKeys.belongsTo(User,{foreignKey:"userId" , as:'user'});

        /// vapi association ///
        Vapi.belongsTo(User,{foreignKey:"userId" , as:'user'});

        /// twilio association ///
        TwilioNumbers.belongsTo(TwilioNumbers, {foreignKey:"userId", as:"user"});
    } catch (error:any) {
        console.log('❌ Association Error : ', error.message);
    }

}